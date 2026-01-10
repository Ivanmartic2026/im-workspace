import AddVehicle from './pages/AddVehicle';
import Admin from './pages/Admin';
import AdminTimeSystem from './pages/AdminTimeSystem';
import AllVehicles from './pages/AllVehicles';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import DrivingJournal from './pages/DrivingJournal';
import DrivingJournalReports from './pages/DrivingJournalReports';
import EditVehicle from './pages/EditVehicle';
import EmployeeDetails from './pages/EmployeeDetails';
import Employees from './pages/Employees';
import GPS from './pages/GPS';
import GeofenceSettings from './pages/GeofenceSettings';
import Home from './pages/Home';
import JournalPolicySettings from './pages/JournalPolicySettings';
import Leave from './pages/Leave';
import ManagerDashboard from './pages/ManagerDashboard';
import ManualDetail from './pages/ManualDetail';
import Manuals from './pages/Manuals';
import MyOnboarding from './pages/MyOnboarding';
import NotificationSettings from './pages/NotificationSettings';
import OnboardingTemplates from './pages/OnboardingTemplates';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import TimeTracking from './pages/TimeTracking';
import VehicleDetails from './pages/VehicleDetails';
import VehicleReports from './pages/VehicleReports';
import VehicleTracking from './pages/VehicleTracking';
import Vehicles from './pages/Vehicles';
import ProjectReports from './pages/ProjectReports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "Admin": Admin,
    "AdminTimeSystem": AdminTimeSystem,
    "AllVehicles": AllVehicles,
    "Chat": Chat,
    "Documents": Documents,
    "DrivingJournal": DrivingJournal,
    "DrivingJournalReports": DrivingJournalReports,
    "EditVehicle": EditVehicle,
    "EmployeeDetails": EmployeeDetails,
    "Employees": Employees,
    "GPS": GPS,
    "GeofenceSettings": GeofenceSettings,
    "Home": Home,
    "JournalPolicySettings": JournalPolicySettings,
    "Leave": Leave,
    "ManagerDashboard": ManagerDashboard,
    "ManualDetail": ManualDetail,
    "Manuals": Manuals,
    "MyOnboarding": MyOnboarding,
    "NotificationSettings": NotificationSettings,
    "OnboardingTemplates": OnboardingTemplates,
    "Profile": Profile,
    "Reports": Reports,
    "Schedule": Schedule,
    "Team": Team,
    "TimeTracking": TimeTracking,
    "VehicleDetails": VehicleDetails,
    "VehicleReports": VehicleReports,
    "VehicleTracking": VehicleTracking,
    "Vehicles": Vehicles,
    "ProjectReports": ProjectReports,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};