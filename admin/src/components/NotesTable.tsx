
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RotateCcw } from 'lucide-react';

interface Note {
  id: number;
  title: string;
  body: string;
  releaseAt: string;
  webhookUrl: string;
  status: string;
}

interface NotesTableProps {
  notes: Note[];
  onReplay: (id: number) => void;
}

const NotesTable: React.FC<NotesTableProps> = ({ notes, onReplay }) => {
  const [replayingIds, setReplayingIds] = useState<Set<number>>(new Set());

  const handleReplay = async (id: number) => {
    setReplayingIds(prev => new Set(prev).add(id));
    try {
      await onReplay(id);
    } finally {
      setReplayingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Notes ({notes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes found. Create your first note above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Release At</TableHead>
                  <TableHead>Webhook URL</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.id}</TableCell>
                    <TableCell className="font-medium">{note.title}</TableCell>
                    <TableCell
                      className="max-w-[300px]"
                      title={note.body}
                    >
                      {truncateContent(note.body)}
                    </TableCell>
                    <TableCell>
                      {new Date(note.releaseAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <a
                        href={note.webhookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {truncateContent(note.webhookUrl, 30)}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(note.status)}>
                        {note.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleReplay(note.id)}
                        disabled={replayingIds.has(note.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {replayingIds.has(note.id) ? 'Replaying...' : 'Replay'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotesTable;
