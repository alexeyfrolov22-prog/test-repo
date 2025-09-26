import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Work as ProjectIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Дашборд', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Планирование', icon: <ScheduleIcon />, path: '/planning' },
  { text: 'Учет времени', icon: <TimeIcon />, path: '/time-entries' },
  { text: 'Сотрудники', icon: <PeopleIcon />, path: '/employees' },
  { text: 'Проекты', icon: <ProjectIcon />, path: '/projects' },
  { text: 'Отчеты', icon: <ReportsIcon />, path: '/reports' },
];

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Планирование ресурсов
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

export default Navigation;