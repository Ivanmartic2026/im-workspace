/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AddVehicle from './pages/AddVehicle';
import Admin from './pages/Admin';
import AdminTimeSystem from './pages/AdminTimeSystem';
import AllVehicles from './pages/AllVehicles';
import Chat from './pages/Chat';
import Documentation from './pages/Documentation';
import Documents from './pages/Documents';
import DrivingJournal from './pages/DrivingJournal';
import DrivingJournalReports from './pages/DrivingJournalReports';
import EditVehicle from './pages/EditVehicle';
import EmployeeDetails from './pages/EmployeeDetails';
import Employees from './pages/Employees';
import GPS from './pages/GPS';
import GeofenceSettings from './pages/GeofenceSettings';
import Home from './pages/Home';
import JournalDashboard from './pages/JournalDashboard';
import JournalPolicySettings from './pages/JournalPolicySettings';
import Leave from './pages/Leave';
import ManagerDashboard from './pages/ManagerDashboard';
import ManualDetail from './pages/ManualDetail';
import Manuals from './pages/Manuals';
import MyOnboarding from './pages/MyOnboarding';
import NotificationSettings from './pages/NotificationSettings';
import OnboardingTemplates from './pages/OnboardingTemplates';
import Profile from './pages/Profile';
import ProjectReports from './pages/ProjectReports';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import TimeTracking from './pages/TimeTracking';
import VehicleDetails from './pages/VehicleDetails';
import VehicleReports from './pages/VehicleReports';
import VehicleTracking from './pages/VehicleTracking';
import Vehicles from './pages/Vehicles';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "Admin": Admin,
    "AdminTimeSystem": AdminTimeSystem,
    "AllVehicles": AllVehicles,
    "Chat": Chat,
    "Documentation": Documentation,
    "Documents": Documents,
    "DrivingJournal": DrivingJournal,
    "DrivingJournalReports": DrivingJournalReports,
    "EditVehicle": EditVehicle,
    "EmployeeDetails": EmployeeDetails,
    "Employees": Employees,
    "GPS": GPS,
    "GeofenceSettings": GeofenceSettings,
    "Home": Home,
    "JournalDashboard": JournalDashboard,
    "JournalPolicySettings": JournalPolicySettings,
    "Leave": Leave,
    "ManagerDashboard": ManagerDashboard,
    "ManualDetail": ManualDetail,
    "Manuals": Manuals,
    "MyOnboarding": MyOnboarding,
    "NotificationSettings": NotificationSettings,
    "OnboardingTemplates": OnboardingTemplates,
    "Profile": Profile,
    "ProjectReports": ProjectReports,
    "Projects": Projects,
    "Reports": Reports,
    "Schedule": Schedule,
    "Team": Team,
    "TimeTracking": TimeTracking,
    "VehicleDetails": VehicleDetails,
    "VehicleReports": VehicleReports,
    "VehicleTracking": VehicleTracking,
    "Vehicles": Vehicles,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};