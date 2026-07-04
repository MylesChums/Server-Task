import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
} from '@mui/material';
import { deleteTask, getTask, processImage, updateTask, uploadImage } from '../api';
import { Task } from '../types';

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!taskId) return;
    const data = await getTask(taskId);
    setTask(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!task) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTask(task.taskId, {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        status: task.status,
      });
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteTask(task.taskId);
    navigate('/');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const updated = await updateTask(task.taskId, {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      requestImageUpload: true,
    });

    if (updated.imageUploadUrl) {
      await uploadImage(updated.imageUploadUrl, file);
      try {
        await processImage(task.taskId);
      } catch (err) {
        console.error('Error processing image:', err);
      }
      load();
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={4} px={2} display="flex" flexDirection="column" gap={2}>
      <TextField
        label="Title"
        value={task.title}
        onChange={(e) => setTask({ ...task, title: e.target.value })}
      />
      <TextField
        label="Description"
        value={task.description}
        onChange={(e) => setTask({ ...task, description: e.target.value })}
        multiline
        minRows={3}
      />
      <TextField
        label="Due date"
        type="date"
        value={task.dueDate ?? ''}
        onChange={(e) => setTask({ ...task, dueDate: e.target.value || null })}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        select
        label="Status"
        value={task.status}
        onChange={(e) => setTask({ ...task, status: e.target.value as Task['status'] })}
      >
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="completed">Completed</MenuItem>
      </TextField>

      {task.imageViewUrl && (
        <Box>
          <img
            src={task.imageViewUrl}
            alt={task.title}
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
          <Box mt={1} display="flex" gap={1} flexWrap="wrap">
            {task.imageLabels.map((label) => (
              <Chip key={label} label={label} size="small" />
            ))}
          </Box>
        </Box>
      )}

      <Button variant="outlined" component="label">
        {task.imageViewUrl ? 'Replace image' : 'Attach image'}
        <input type="file" accept="image/*" hidden onChange={handleFileChange} />
      </Button>

      <Box display="flex" gap={2}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button color="error" onClick={handleDelete}>
          Delete
        </Button>
        <Button onClick={() => navigate('/')}>Back</Button>
      </Box>
    </Box>
  );
}
