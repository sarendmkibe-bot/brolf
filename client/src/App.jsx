
import Navbar from './components/Navbar.jsx';
import RequireRole from './components/RequireRole.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import PaymentReturn from './pages/PaymentReturn.jsx';
import SellerDashboard from './pages/seller/SellerDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Footer from './components/Footer.jsx';
import { Routes, Route, useLocation } from 'react-router-dom';
import AIChatWidget from './components/AIChatWidget.jsx';

// NEW: Particle Background
import ParticleBackground from './components/ParticleBackground.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isHomePage = pathname === '/';

  return (
    <div
      className={`relative isolate min-h-screen flex flex-col ${
        isHomePage ? 'home-background' : 'dashboard-background'
      }`}
    >
      {/* NEW: Background particles */}
      <ParticleBackground />

      {/* Website content */}
      <div className="relative z-10 flex min-h-screen flex-col">

        <Navbar />

        <main className="relative z-0 mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />

            <Route
              path="/checkout"
              element={
                <RequireRole roles={['customer']}>
                  <Checkout />
                </RequireRole>
              }
            />

            <Route
              path="/orders"
              element={
                <RequireRole roles={['customer']}>
                  <Orders />
                </RequireRole>
              }
            />

            <Route
              path="/payment/return"
              element={
                <RequireRole roles={['customer']}>
                  <PaymentReturn />
                </RequireRole>
              }
            />

            <Route
              path="/seller"
              element={
                <RequireRole roles={['seller']}>
                  <SellerDashboard />
                </RequireRole>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <AdminDashboard />
                </RequireRole>
              }
            />

            <Route
              path="*"
              element={<p className="text-muted">Page not found.</p>}
            />
          </Routes>
        </main>

        <Footer />

        <AIChatWidget />

      </div>
    </div>
  );
}
