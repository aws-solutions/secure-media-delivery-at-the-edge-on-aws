/**
 * The default handler that is called when the user cancels
 * a prompting question (e.g Ctrl+C). The default behavior is to exit the
 * wizard.
 */
export const onCancel = (): void => process.exit(1);