import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ru';

import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import TimeEntries from './pages/TimeEntries';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Reports from './pages/Reports';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
        <Router>
          <Box sx={{ display: 'flex' }}>
            <Navigation />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                bgcolor: 'background.default',
                p: 3,
                minHeight: '100vh',
              }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/time-entries" element={<TimeEntries />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;