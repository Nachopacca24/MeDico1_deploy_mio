// src/services/notificationService.ts

interface ScheduledNotification {
  id: string
  caseId: number
  patientName: string
  surgeryDate: string
  hospitalName: string
  notifyAt: string
  sent: boolean
}

class NotificationService {
  private readonly STORAGE_KEY = 'scheduled-notifications'
  private checkInterval: number | null = null

  initialize() {
    if (this.checkInterval) return
    
    this.checkInterval = window.setInterval(() => {
      this.checkPendingNotifications()
    }, 60000)
    
    this.checkPendingNotifications()
  }

  scheduleNotification(
    caseId: number,
    patientName: string,
    surgeryDate: string,
    hospitalName: string
  ) {
    const surgeryDateTime = new Date(surgeryDate)
    const notifyDateTime = new Date(surgeryDateTime.getTime() - 5 * 60 * 60 * 1000)
    
    if (notifyDateTime < new Date()) {
      console.log('⏰ Notification time is in the past, skipping')
      return
    }

    const notification: ScheduledNotification = {
      id: `notif-${caseId}-${Date.now()}`,
      caseId,
      patientName,
      surgeryDate,
      hospitalName,
      notifyAt: notifyDateTime.toISOString(),
      sent: false
    }

    const notifications = this.getNotifications()
    notifications.push(notification)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications))
    
    console.log('✅ Notification scheduled:', notification)
  }

  private getNotifications(): ScheduledNotification[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private checkPendingNotifications() {
    const notifications = this.getNotifications()
    const now = new Date()
    
    notifications.forEach(notif => {
      if (!notif.sent && new Date(notif.notifyAt) <= now) {
        this.sendNotification(notif)
        notif.sent = true
      }
    })
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications))
    this.cleanOldNotifications()
  }

  private sendNotification(notif: ScheduledNotification) {
    console.log('🔔 Sending notification:', notif)
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏥 Recordatorio de Cirugía', {
        body: `Cirugía de ${notif.patientName} en ${notif.hospitalName} en 5 horas`,
        icon: '/icon.png',
        tag: notif.id
      })
    }
    
    window.dispatchEvent(new CustomEvent('surgery-reminder', { detail: notif }))
  }

  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  private cleanOldNotifications() {
    const notifications = this.getNotifications()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const filtered = notifications.filter(n => 
      new Date(n.surgeryDate) > oneDayAgo
    )
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
  }

  cancelNotification(caseId: number) {
    const notifications = this.getNotifications()
    const filtered = notifications.filter(n => n.caseId !== caseId)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
  }

  destroy() {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const notificationService = new NotificationService()