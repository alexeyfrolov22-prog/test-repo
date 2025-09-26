import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';
import dayjs from 'dayjs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    currentWeekPlanning: [],
    budgetSummary: null,
    recentTimeEntries: [],
    employeeSummary: [],
    projectSummary: [],
  });

  const getCurrentWeekStart = () => {
    return dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'); // Monday
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentWeek = getCurrentWeekStart();

      const [planningRes, budgetRes, timeEntriesRes, employeeRes, projectRes] = await Promise.all([
        axios.get(`/api/planning/${currentWeek}`),
        axios.get(`/api/planning/${currentWeek}/budget`),
        axios.get('/api/time-entries?limit=10'),
        axios.get('/api/time-entries/summary?group_by=employee'),
        axios.get('/api/time-entries/summary?group_by=project'),
      ]);

      setDashboardData({
        currentWeekPlanning: planningRes.data,
        budgetSummary: budgetRes.data,
        recentTimeEntries: timeEntriesRes.data,
        employeeSummary: employeeRes.data,
        projectSummary: projectRes.data,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const getEfficiencyColor = (planned, actual) => {
    if (!planned) return 'default';
    const ratio = actual / planned;
    if (ratio <= 0.8) return 'success';
    if (ratio <= 1.0) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const { budgetSummary, currentWeekPlanning, recentTimeEntries, employeeSummary, projectSummary } = dashboardData;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Дашборд
      </Typography>
      
      {/* Budget Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Запланировано часов
              </Typography>
              <Typography variant="h5">
                {budgetSummary?.summary.total_planned_hours || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Фактически часов
              </Typography>
              <Typography variant="h5">
                {budgetSummary?.summary.total_actual_hours || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Плановый бюджет
              </Typography>
              <Typography variant="h5">
                {formatCurrency(budgetSummary?.summary.total_planned_budget || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Фактический бюджет
              </Typography>
              <Typography variant="h5">
                {formatCurrency(budgetSummary?.summary.total_actual_budget || 0)}
              </Typography>
              <Typography 
                variant="body2" 
                color={budgetSummary?.summary.variance_budget < 0 ? 'success.main' : 'error.main'}
              >
                {budgetSummary?.summary.variance_budget < 0 ? 'Экономия: ' : 'Перерасход: '}
                {formatCurrency(Math.abs(budgetSummary?.summary.variance_budget || 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Current Week Planning */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Планирование на текущую неделю
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Сотрудник</TableCell>
                    <TableCell>Проект</TableCell>
                    <TableCell align="right">План</TableCell>
                    <TableCell align="right">Факт</TableCell>
                    <TableCell align="right">Эффективность</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentWeekPlanning.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.employee_name}</TableCell>
                      <TableCell>{item.project_name}</TableCell>
                      <TableCell align="right">{item.planned_hours}ч</TableCell>
                      <TableCell align="right">{item.actual_hours}ч</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${((item.actual_hours / item.planned_hours) * 100 || 0).toFixed(0)}%`}
                          color={getEfficiencyColor(item.planned_hours, item.actual_hours)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Employee Hours Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Часы по сотрудникам
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employeeSummary}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}ч`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total_hours"
                  nameKey="name"
                >
                  {employeeSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Project Hours Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Часы по проектам
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_hours" fill="#8884d8" name="Часы" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Time Entries */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Последние записи времени
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Сотрудник</TableCell>
                    <TableCell>Проект</TableCell>
                    <TableCell align="right">Часы</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTimeEntries.slice(0, 5).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{dayjs(entry.work_date).format('DD.MM.YYYY')}</TableCell>
                      <TableCell>{entry.employee_name}</TableCell>
                      <TableCell>{entry.project_name}</TableCell>
                      <TableCell align="right">{entry.hours_worked}ч</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;