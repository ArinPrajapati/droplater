
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NoteFormProps {
  onNoteCreated: () => void;
}

const NoteForm: React.FC<NoteFormProps> = ({ onNoteCreated }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!title || !body || !releaseAt || !webhookUrl) {
      alert('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-secret'
        },
        body: JSON.stringify({
          title,
          body,
          releaseAt,
          webhookUrl,
        }),
      });

      if (response.ok) {
        alert('Note created successfully!');
        setTitle('');
        setBody('');
        setReleaseAt('');
        setWebhookUrl('');
        onNoteCreated();
      } else {
        const errorData = await response.json();
        alert(`Failed to create note: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating note:', error);
      alert('An error occurred while creating the note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Create a New Note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              type="text"
              id="title"
              placeholder="Enter note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Enter your note content"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="releaseAt">Release At</Label>
            <Input
              type="datetime-local"
              id="releaseAt"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              type="url"
              id="webhookUrl"
              placeholder="https://example.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating...' : 'Create Note'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NoteForm;
