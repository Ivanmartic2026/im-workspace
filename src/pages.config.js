import Documents from './pages/Documents';
import Home from './pages/Home';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Team from './pages/Team';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Documents": Documents,
    "Home": Home,
    "Leave": Leave,
    "Profile": Profile,
    "Schedule": Schedule,
    "Team": Team,
    "Vehicles": Vehicles,
    "VehicleDetails": VehicleDetails,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};