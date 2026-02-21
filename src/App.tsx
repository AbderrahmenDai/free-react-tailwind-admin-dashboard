import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UnauthorizedPage from "./pages/OtherPage/UnauthorizedPage";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ScanPage from "./pages/Scan/ScanPage";
import ReferenceList from "./pages/References/ReferenceList";
import OfList from "./pages/OF/OfList";
import ScanHistory from "./pages/History/ScanHistory";
import ProductionLinesPage from "./pages/ProductionLines/ProductionLinesPage";
import UserList from "./pages/Users/UserList";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout — all inner routes require authentication */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* ── Visible to ALL authenticated roles ── */}
            <Route index path="/" element={<Home />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/history" element={<ScanHistory />} />

            {/* ── Production management: ADMIN, METHODE, SUPERVISEUR, SUPERVISOR ── */}
            <Route
              path="/of"
              element={
                <ProtectedRoute roles={["ADMIN", "METHODE", "SUPERVISEUR", "SUPERVISOR"]}>
                  <OfList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/production-lines"
              element={
                <ProtectedRoute roles={["ADMIN", "METHODE", "SUPERVISEUR", "SUPERVISOR"]}>
                  <ProductionLinesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/references"
              element={
                <ProtectedRoute roles={["ADMIN", "METHODE", "SUPERVISEUR", "SUPERVISOR"]}>
                  <ReferenceList />
                </ProtectedRoute>
              }
            />

            {/* ── User management: ADMIN only ── */}
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <UserList />
                </ProtectedRoute>
              }
            />

            {/* ── Others ── */}
            <Route path="/blank" element={<Blank />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Auth routes — public */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
