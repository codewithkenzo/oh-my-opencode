export interface RunwareNotificationHookInput {
  tool: string
  sessionID: string
  callID: string
}

export interface RunwareNotificationHookOutput {
  output: string
}
