import { sendNotification } from '@tauri-apps/plugin-notification'

export async function notifyBreakStart() {
  await sendNotification({
    title: "Break Time 🎉",
    body: "Step away for 5 minutes!"
  })
}

export async function notifyWorkStart() {
  await sendNotification({
    title: "Back to Focus ⚒️",
    body: "Pomodoro session started."
  })
}
