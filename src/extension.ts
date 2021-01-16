import * as fs from 'fs';
import { URL } from 'url';
import { commands, env, window, workspace, ExtensionContext, Uri } from 'vscode';

const extName = 'openSrcInBrowser';

// Returns the configured root URL of the remote repo; prompts user to set it if none exists or if edit=True.
async function getRootURL(edit = false) {
	const config = workspace.getConfiguration(extName);
	const rootURLconfig : string = config.get('rootURL');

	if (rootURLconfig === '' || edit) {
		const newURL = await window.showInputBox({ placeHolder: 'Set the root URL where your code is hosted' });
		try {
			const url = new URL(newURL);
			config.update('rootURL', newURL);
			return url;
		} catch (err) {
			window.showErrorMessage(`${newURL} is not a valid URL.`);
			return undefined;
		}
	} else {
		return new URL(rootURLconfig);
	}
}

// Called when the extension is activated
export function activate(context: ExtensionContext) {

	console.log('🎉 Extension "Open Source Code in Browser" is now active!');

	// Command to open the current file in the remote.
	let openCmd = commands.registerCommand(`${extName}.open`, async (uri : Uri) => {
		// The code you place here will be executed every time your command is executed

		const rootURL = await getRootURL();
		const currDocument = window.activeTextEditor.document;

		if (!currDocument.isUntitled && workspace.workspaceFolders && rootURL) {
			const currURI = (uri) ? uri.fsPath : currDocument.uri.fsPath;
			const currRelativePath = currURI.replace(workspace.workspaceFolders[0].uri.fsPath, '');

			let url = `${rootURL.toString()}`;
			if (rootURL.hostname === 'github.com') {
				// this is actually not necessary since blob redirects to tree when needed and vice versa
				const isFile = (await fs.promises.lstat(currURI)).isFile();
				url += (isFile) ? '/blob/main' : '/tree/main';
			}

			// window.showInformationMessage(`Opening in browser: ${Uri.parse(`${url}${currRelativePath}`)}`);
			env.openExternal(Uri.parse(`${url}${currRelativePath}`));
		} else {
			window.showInformationMessage('Nothing to open.');
		}
	});

	// Command to edit the root URL of the remote repo
	let editRootURLCmd = commands.registerCommand(`${extName}.editRootURL`, async () => {
		const newURL = await getRootURL(true);
		if (newURL) {
			window.showInformationMessage(`Root URL was changed to ${newURL.toString()}.`);
		} else {
			window.showErrorMessage('Root URL was not changed.');
		}
	});

	// Ensure commands are de-registered when extension is deactivated
	context.subscriptions.push(openCmd);
	context.subscriptions.push(editRootURLCmd);
}

// Called when extension is deactivated
export function deactivate() {}
