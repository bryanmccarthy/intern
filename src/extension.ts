import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function activate(context: vscode.ExtensionContext) {

	let disposable1 = vscode.commands.registerCommand('intern.refactorSelection', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }

        const fullLineRange = await processSelectionRange(editor);
        const selectedText = editor.document.getText(fullLineRange);

        let result = await refactorBlock(selectedText);
        if (result instanceof Error) {
            vscode.window.showErrorMessage('Error refactoring code: ' + result);
            return;
        }

        // Remove backticks and code blocks
        result = formatResult(String(result));

        editor.edit((editBuilder) => {
            editBuilder.replace(fullLineRange, String(result));
        });
	});

    let disposable2 = vscode.commands.registerCommand('intern.commentSelection', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }

        const fullLineRange = await processSelectionRange(editor);
        const selectedText = editor.document.getText(fullLineRange);

        let result = await commentBlock(selectedText);
        if (result instanceof Error) {
            vscode.window.showErrorMessage('Error commenting code: ' + result);
            return;
        }

        // Remove backticks and code blocks
        result = formatResult(String(result));

        editor.edit((editBuilder) => {
            editBuilder.replace(fullLineRange, String(result));
        });
        
    });

	context.subscriptions.push(disposable1);
    context.subscriptions.push(disposable2);
}

const formatResult = (result: string) => {
    return result.replace(/```[\s\S]*?```/g, match => {
        return match.replace(/```[\s\S]*?\n/g, '').replace(/```/g, '');
    });
}

const processSelectionRange = async (editor: vscode.TextEditor) => {
    const selection = editor.selection;
    const startLine = selection.start.line;
    const endLine = selection.end.line;
    const fullLineRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);

    return fullLineRange;
}

// Send the provided code to OpenAI for refactoring
const refactorBlock = async (prompt: string) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "system", 
        content: `Please refactor the provided code. Aim for readability and fewer lines. Only return the code. Code: ${prompt}` 
      }],
      model: "gpt-4o",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    return error;
  }
}

const commentBlock = async (prompt: string) => {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ 
                role: "system", 
                content: `Please add comments to the provided code. Keep them short and concise. Do not refactor the code. Code: ${prompt}` 
            }],
            model: "gpt-4o",
        });

        return completion.choices[0].message.content;
    } catch (error) {
        return error;
    }
}

export function deactivate() {}
