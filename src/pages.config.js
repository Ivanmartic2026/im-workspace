import AddVehicle from './pages/AddVehicle';
import Documents from './pages/Documents';
import EditVehicle from './pages/EditVehicle';
import Employees from './pages/Employees';
import GPS from './pages/GPS';
import Home from './pages/Home';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import VehicleDetails from './pages/VehicleDetails';
import VehicleReports from './pages/VehicleReports';
import VehicleTracking from './pages/VehicleTracking';
import Vehicles from './pages/Vehicles';
import DrivingJournal from './pages/DrivingJournal';
import DrivingJournalReports from './pages/DrivingJournalReports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "Documents": Documents,
    "EditVehicle": EditVehicle,
    "Employees": Employees,
    "GPS": GPS,
    "Home": Home,
    "Leave": Leave,
    "Profile": Profile,
    "Reports": Reports,
    "Schedule": Schedule,
    "Team": Team,
    "VehicleDetails": VehicleDetails,
    "VehicleReports": VehicleReports,
    "VehicleTracking": VehicleTracking,
    "Vehicles": Vehicles,
    "DrivingJournal": DrivingJournal,
    "DrivingJournalReports": DrivingJournalReports,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};