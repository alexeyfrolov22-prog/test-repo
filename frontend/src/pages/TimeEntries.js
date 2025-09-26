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
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';

function TimeEntries() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    project_id: '',
    work_date: dayjs(),
    hours_worked: '',
    description: '',
  });
  const [filters, setFilters] = useState({
    start_date: dayjs().subtract(7, 'day'),
    end_date: dayjs(),
    employee_id: '',
    project_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
    loadProjects();
    loadTimeEntries();
  }, []);

  useEffect(() => {
    loadTimeEntries();
  }, [filters]);

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

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.start_date) {
        params.append('start_date', filters.start_date.format('YYYY-MM-DD'));
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date.format('YYYY-MM-DD'));
      }
      if (filters.employee_id) {
        params.append('employee_id', filters.employee_id);
      }
      if (filters.project_id) {
        params.append('project_id', filters.project_id);
      }
      
      const response = await axios.get(`/api/time-entries?${params.toString()}`);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Error loading time entries:', error);
      setError('Ошибка загрузки записей времени');
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
        work_date: dayjs(entry.work_date),
        hours_worked: entry.hours_worked,
        description: entry.description || '',
      });
    } else {
      setEditingEntry(null);
      setFormData({
        employee_id: '',
        project_id: '',
        work_date: dayjs(),
        hours_worked: '',
        description: '',
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
      
      if (!formData.employee_id || !formData.project_id || !formData.work_date || !formData.hours_worked) {
        setError('Все обязательные поля должны быть заполнены');
        return;
      }

      const dataToSend = {
        ...formData,
        work_date: formData.work_date.format('YYYY-MM-DD'),
        hours_worked: parseFloat(formData.hours_worked),
      };

      if (editingEntry) {
        await axios.put(`/api/time-entries/${editingEntry.id}`, dataToSend);
      } else {
        await axios.post('/api/time-entries', dataToSend);
      }
      
      handleCloseDialog();
      loadTimeEntries();
    } catch (error) {
      console.error('Error saving time entry:', error);
      setError('Ошибка сохранения записи времени');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      try {
        await axios.delete(`/api/time-entries/${id}`);
        loadTimeEntries();
      } catch (error) {
        console.error('Error deleting time entry:', error);
        setError('Ошибка удаления записи времени');
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      start_date: dayjs().subtract(7, 'day'),
      end_date: dayjs(),
      employee_id: '',
      project_id: '',
    });
  };

  const getTotalHours = () => {
    return timeEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Учет времени
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить запись
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Фильтры
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Дата от"
              value={filters.start_date}
              onChange={(newValue) => setFilters({...filters, start_date: newValue})}
              format="DD.MM.YYYY"
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Дата до"
              value={filters.end_date}
              onChange={(newValue) => setFilters({...filters, end_date: newValue})}
              format="DD.MM.YYYY"
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Сотрудник</InputLabel>
              <Select
                value={filters.employee_id}
                onChange={(e) => setFilters({...filters, employee_id: e.target.value})}
                label="Сотрудник"
              >
                <MenuItem value="">Все</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Проект</InputLabel>
              <Select
                value={filters.project_id}
                onChange={(e) => setFilters({...filters, project_id: e.target.value})}
                label="Проект"
              >
                <MenuItem value="">Все</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button onClick={clearFilters} variant="outlined" fullWidth>
              Очистить
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary */}
      <Box mb={2}>
        <Chip 
          label={`Всего записей: ${timeEntries.length}`} 
          color="primary" 
          sx={{ mr: 1 }} 
        />
        <Chip 
          label={`Всего часов: ${getTotalHours()}`} 
          color="secondary" 
        />
      </Box>

      {/* Time Entries Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Сотрудник</TableCell>
                <TableCell>Проект</TableCell>
                <TableCell align="right">Часы</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{dayjs(entry.work_date).format('DD.MM.YYYY')}</TableCell>
                  <TableCell>{entry.employee_name}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{entry.project_name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {entry.project_code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{entry.hours_worked}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {entry.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(entry)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(entry.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {timeEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      Нет записей времени для выбранного периода
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
          {editingEntry ? 'Редактировать запись времени' : 'Добавить запись времени'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Сотрудник *</InputLabel>
                <Select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  label="Сотрудник *"
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Проект *</InputLabel>
                <Select
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  label="Проект *"
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Дата работы *"
                value={formData.work_date}
                onChange={(newValue) => setFormData({...formData, work_date: newValue})}
                format="DD.MM.YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Количество часов *"
                type="number"
                value={formData.hours_worked}
                onChange={(e) => setFormData({...formData, hours_worked: e.target.value})}
                inputProps={{ min: 0, max: 24, step: 0.25 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание работы"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
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

export default TimeEntries;