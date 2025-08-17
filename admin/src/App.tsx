import { useState, useEffect } from 'react';
import NoteForm from './components/NoteForm';
import NotesTable from './components/NotesTable';
import './App.css';

interface Note {
  _id: number;
  title: string;
  body: string;
  releaseAt: string;
  webhookUrl: string;
  status: string;
  attempts?: [{}]
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/notes?', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer test-secret`
        }
      }
      );
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
      } else {
        console.error('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("fetching notes...");
    fetchNotes();
  }, []);

  const handleNoteCreated = () => {
    fetchNotes();
  };

  const handleReplay = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/notes/${id}/replay`, {
        method: 'POST',
      });
      if (response.ok) {
        alert('Note replayed successfully!');
        fetchNotes();
      } else {
        const errorData = await response.json();
        alert(`Failed to replay note: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error replaying note:', error);
      alert('An error occurred while replaying the note.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Admin Interface</h1>
          <p className="text-muted-foreground">Manage your scheduled notes and email delivery</p>
        </div>

        <div className="space-y-8">
          <NoteForm onNoteCreated={handleNoteCreated} />

          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading notes...</div>
            </div>
          ) : (
            <NotesTable notes={notes} onReplay={handleReplay} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
