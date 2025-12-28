import AddVehicle from './pages/AddVehicle';
import Documents from './pages/Documents';
import Home from './pages/Home';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import VehicleDetails from './pages/VehicleDetails';
import Vehicles from './pages/Vehicles';
import EditVehicle from './pages/EditVehicle';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddVehicle": AddVehicle,
    "Documents": Documents,
    "Home": Home,
    "Leave": Leave,
    "Profile": Profile,
    "Schedule": Schedule,
    "Team": Team,
    "VehicleDetails": VehicleDetails,
    "Vehicles": Vehicles,
    "EditVehicle": EditVehicle,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};