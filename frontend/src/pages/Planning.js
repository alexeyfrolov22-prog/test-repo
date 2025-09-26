import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';

function Planning() {
  const [planningData, setPlanningData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(dayjs().startOf('week').add(1, 'day'));
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    project_id: '',
    planned_hours: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
    loadProjects();
  }, []);

  useEffect(() => {
    loadPlanningData();
  }, [selectedWeek]);

  const loadEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await axios.get('/api/projects?active_only=true');
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadPlanningData = async () => {
    try {
      setLoading(true);
      const weekStart = selectedWeek.format('YYYY-MM-DD');
      const response = await axios.get(`/api/planning/${weekStart}`);
      setPlanningData(response.data);
    } catch (error) {
      console.error('Error loading planning data:', error);
      setError('Ошибка загрузки данных планирования');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (entry = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        employee_id: entry.employee_id,
        project_id: entry.project_id,
        planned_hours: entry.planned_hours,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        employee_id: '',
        project_id: '',
        planned_hours: '',
      });
    }
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEntry(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!formData.employee_id || !formData.project_id || !formData.planned_hours) {
        setError('Все поля обязательны для заполнения');
        return;
      }

      const dataToSend = {
        ...formData,
        week_start_date: selectedWeek.format('YYYY-MM-DD'),
        planned_hours: parseFloat(formData.planned_hours),
        created_by_manager_id: 1, // TODO: get from auth context
      };

      await axios.post('/api/planning', dataToSend);
      
      handleCloseDialog();
      loadPlanningData();
    } catch (error) {
      console.error('Error saving planning entry:', error);
      setError('Ошибка сохранения записи планирования');
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

  const getWeekRange = (startDate) => {
    const start = dayjs(startDate);
    const end = start.add(6, 'day');
    return `${start.format('DD.MM')} - ${end.format('DD.MM.YYYY')}`;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Планирование ресурсов
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить план
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <DatePicker
            label="Неделя (понедельник)"
            value={selectedWeek}
            onChange={(newValue) => setSelectedWeek(newValue)}
            format="DD.MM.YYYY"
            slotProps={{ 
              textField: { 
                fullWidth: true,
                helperText: `Неделя: ${getWeekRange(selectedWeek)}`
              } 
            }}
          />
        </Grid>
      </Grid>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Сотрудник</TableCell>
                <TableCell>Должность</TableCell>
                <TableCell>Проект</TableCell>
                <TableCell align="right">План (часы)</TableCell>
                <TableCell align="right">Факт (часы)</TableCell>
                <TableCell align="right">Отклонение</TableCell>
                <TableCell align="right">Ставка</TableCell>
                <TableCell align="right">План (бюджет)</TableCell>
                <TableCell align="right">Факт (бюджет)</TableCell>
                <TableCell align="right">Эффективность</TableCell>
                <TableCell align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {planningData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.employee_name}</TableCell>
                  <TableCell>{entry.position}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{entry.project_name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {entry.project_code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{entry.planned_hours}</TableCell>
                  <TableCell align="right">{entry.actual_hours}</TableCell>
                  <TableCell align="right">
                    <Typography 
                      color={entry.variance_hours > 0 ? 'error' : 'success.main'}
                    >
                      {entry.variance_hours > 0 ? '+' : ''}{entry.variance_hours}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(entry.current_rate)}/час
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(entry.planned_budget)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(entry.actual_budget)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${((entry.actual_hours / entry.planned_hours) * 100 || 0).toFixed(0)}%`}
                      color={getEfficiencyColor(entry.planned_hours, entry.actual_hours)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(entry)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {planningData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography color="textSecondary">
                      Нет данных планирования для выбранной недели
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEntry ? 'Редактировать план' : 'Добавить план'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Сотрудник</InputLabel>
                <Select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  label="Сотрудник"
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Проект</InputLabel>
                <Select
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  label="Проект"
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Запланированные часы"
                type="number"
                value={formData.planned_hours}
                onChange={(e) => setFormData({...formData, planned_hours: e.target.value})}
                inputProps={{ min: 0, max: 168, step: 0.5 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={loading}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Planning;