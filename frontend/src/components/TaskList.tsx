import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Link, useNavigate } from 'react-router-dom';
import { deleteTask, listTasks, updateTask } from '../api';
import { Task } from '../types';

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadTasks = async () => {
    setLoading(true);
    const data = await listTasks();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const toggleComplete = async (task: Task) => {
    await updateTask(task.taskId, {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status === 'completed' ? 'pending' : 'completed',
    });
    loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    loadTasks();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box maxWidth={600} mx="auto" mt={4} px={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Your Tasks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/new')}
        >
          New Task
        </Button>
      </Box>

      {tasks.length === 0 && (
        <Typography color="text.secondary">No tasks yet — create your first one.</Typography>
      )}

      <List>
        {tasks.map((task) => (
          <ListItem
            key={task.taskId}
            component={Link}
            to={`/tasks/${task.taskId}`}
            sx={{ textDecoration: 'none', color: 'inherit' }}
            secondaryAction={
              <IconButton
                edge="end"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(task.taskId);
                }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <Checkbox
              checked={task.status === 'completed'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleComplete(task);
              }}
            />
            {task.imageViewUrl && (
              <ListItemAvatar>
                <Avatar src={task.imageViewUrl} variant="rounded" />
              </ListItemAvatar>
            )}
            <ListItemText
              primary={task.title}
              secondary={task.dueDate ? `Due ${task.dueDate}` : task.description}
              sx={{
                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
