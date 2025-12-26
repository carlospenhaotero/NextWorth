import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import DashboardBento from './pages/DashboardBento';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import AddAsset from './pages/AddAsset';
import SearchAssets from './pages/SearchAssets';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardBento />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssetList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:symbol"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssetDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-asset"
            element={
              <ProtectedRoute>
                {/* AddAsset already includes Layout internally, but we might want to unify this.
                     For now, let's keep it as is or wrap it if AddAsset removes its internal Layout.
                     Looking at AddAsset code, it uses Layout. So we don't wrap it here to avoid double layout.
                 */}
                <AddAsset />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search-assets"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchAssets />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;



