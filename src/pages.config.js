import AddVehicle from './pages/AddVehicle';
import Documents from './pages/Documents';
import EditVehicle from './pages/EditVehicle';
import Home from './pages/Home';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import VehicleDetails from './pages/VehicleDetails';
import Vehicles from './pages/Vehicles';
import VehicleTracking from './pages/VehicleTracking';
import GPS from './pages/GPS';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import VehicleReports from './pages/VehicleReports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "Documents": Documents,
    "EditVehicle": EditVehicle,
    "Home": Home,
    "Leave": Leave,
    "Profile": Profile,
    "Schedule": Schedule,
    "Team": Team,
    "VehicleDetails": VehicleDetails,
    "Vehicles": Vehicles,
    "VehicleTracking": VehicleTracking,
    "GPS": GPS,
    "Employees": Employees,
    "Reports": Reports,
    "VehicleReports": VehicleReports,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};