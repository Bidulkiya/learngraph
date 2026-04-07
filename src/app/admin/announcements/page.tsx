import { getMySchools } from '@/actions/school'
import { getAnnouncements } from '@/actions/announcements'
import { AnnouncementManager } from './AnnouncementManager'

export default async function AdminAnnouncementsPage() {
  const [schoolsRes, announcementsRes] = await Promise.all([
    getMySchools(),
    getAnnouncements(),
  ])

  return (
    <AnnouncementManager
      schools={schoolsRes.data ?? []}
      announcements={announcementsRes.data ?? []}
    />
  )
}
