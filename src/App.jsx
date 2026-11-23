import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Requests from './pages/Requests'
import NewRequest from './pages/NewRequest'
import RequestDetail from './pages/RequestDetail'
import Approvals from './pages/Approvals'
import Finance from './pages/Finance'
import Register, { AssetDetail } from './pages/Register'
import { ReportProblem, Incidents, IncidentDetail } from './pages/Incidents'
import { Store, BookingDetail, NewBooking } from './pages/Store'
import Deliveries from './pages/Deliveries'
import { Donations, DonationIn, Disposal } from './pages/Donations'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import Notifications from './pages/Notifications'
import HandoverForm from './pages/HandoverForm'

function Gate() {
  const { userId, me, ready } = useApp()
  if (userId === undefined || (userId && !ready)) return <div className="login muted">Loading…</div>
  if (!userId) return <Login />
  if (!me) return <div className="login card"><h2>Almost there</h2><p>Your profile is being set up. Refresh in a moment, or ask the Asset Coordinator to check your access.</p></div>
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="handover/:id" element={<HandoverForm />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="finance" element={<Finance />} />
        <Route path="register" element={<Register />} />
        <Route path="register/:id" element={<AssetDetail />} />
        <Route path="report-problem" element={<ReportProblem />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="store" element={<Store />} />
        <Route path="store/new" element={<NewBooking />} />
        <Route path="store/:id" element={<BookingDetail />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="donations" element={<Donations />} />
        <Route path="donations/in/:id" element={<DonationIn />} />
        <Route path="donations/out/:id" element={<Disposal />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<Admin />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return <AppProvider><HashRouter><Gate /></HashRouter></AppProvider>
}
