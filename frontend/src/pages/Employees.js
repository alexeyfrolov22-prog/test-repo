import React from 'react';
import { Typography, Box } from '@mui/material';

function Employees() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Сотрудники
      </Typography>
      <Typography color="textSecondary">
        Страница управления сотрудниками в разработке...
      </Typography>
    </Box>
  );
}

export default Employees;