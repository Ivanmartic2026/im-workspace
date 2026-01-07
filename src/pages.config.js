import AddVehicle from './pages/AddVehicle';
import AllVehicles from './pages/AllVehicles';
import Documents from './pages/Documents';
import DrivingJournal from './pages/DrivingJournal';
import DrivingJournalReports from './pages/DrivingJournalReports';
import EditVehicle from './pages/EditVehicle';
import Employees from './pages/Employees';
import GPS from './pages/GPS';
import Home from './pages/Home';
import JournalPolicySettings from './pages/JournalPolicySettings';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import VehicleDetails from './pages/VehicleDetails';
import VehicleReports from './pages/VehicleReports';
import VehicleTracking from './pages/VehicleTracking';
import Vehicles from './pages/Vehicles';
import TimeTracking from './pages/TimeTracking';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminTimeSystem from './pages/AdminTimeSystem';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "AllVehicles": AllVehicles,
    "Documents": Documents,
    "DrivingJournal": DrivingJournal,
    "DrivingJournalReports": DrivingJournalReports,
    "EditVehicle": EditVehicle,
    "Employees": Employees,
    "GPS": GPS,
    "Home": Home,
    "JournalPolicySettings": JournalPolicySettings,
    "Leave": Leave,
    "Profile": Profile,
    "Reports": Reports,
    "Schedule": Schedule,
    "Team": Team,
    "VehicleDetails": VehicleDetails,
    "VehicleReports": VehicleReports,
    "VehicleTracking": VehicleTracking,
    "Vehicles": Vehicles,
    "TimeTracking": TimeTracking,
    "ManagerDashboard": ManagerDashboard,
    "AdminTimeSystem": AdminTimeSystem,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};