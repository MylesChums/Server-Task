import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createTask, processImage, uploadImage } from '../api';

export default function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const task = await createTask({
        title,
        description,
        dueDate: dueDate || null,
        hasImage: !!file,
      });

      if (file && task.imageUploadUrl) {
        await uploadImage(task.imageUploadUrl, file);
        try {
          await processImage(task.taskId);
        } catch (err) {
          // Image analysis failing shouldn't block the task from being created.
          console.error('Error processing image:', err);
        }
      }

      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={4} px={2}>
      <Typography variant="h5" mb={2}>
        New Task
      </Typography>
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={3}
        />
        <TextField
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" component="label">
          {file ? file.name : 'Attach image'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Create Task'}
          </Button>
          <Button onClick={() => navigate('/')}>Cancel</Button>
        </Box>
      </Box>
    </Box>
  );
}
