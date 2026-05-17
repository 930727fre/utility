import { useState } from 'react';
import {
  TextInput, Stack, Paper, Text, Textarea,
  Button, Title, Box, ScrollArea
} from '@mantine/core';
import PageShell from '../components/PageShell';
import { notifications } from '@mantine/notifications';
import { api } from '../api';
import type { Card } from '../types';


export default function EditPage() {

  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [sentence, setSentence] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setSelected(null);
    if (!q.trim()) { setCandidates([]); return; }
    try {
      const results = await api.searchCards(q);
      setCandidates(results);
    } catch {
      notifications.show({ title: 'Search failed', message: 'Check network connection' });
    }
  };

  const handleSelect = (card: Card) => {
    setSelected(card);
    setSentence(card.sentence);
    setNote(card.note);
    setQuery(card.word);
    setCandidates([]);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.updateCard(selected.id, { sentence, note });
      setSelected({ ...selected, sentence, note });
      notifications.show({ message: `${selected.word} updated` });
    } catch {
      notifications.show({ title: 'Update failed', message: 'Check network connection' });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = selected && (sentence !== selected.sentence || note !== selected.note);

  return (
    <PageShell size="xs">
      <style>{`
        .candidate-row { cursor: pointer; }
        .candidate-row:hover { background: var(--raised); }
      `}</style>
      <Stack gap="lg">
        <Title order={2} c="var(--text-h)" style={{ letterSpacing: '-0.5px' }}>Edit</Title>

        {/* Search */}
        <Box style={{ position: 'relative' }}>
          <TextInput
            placeholder="Search a word..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            styles={{
              input: {
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-h)',
              },
            }}
          />

          {candidates.length > 0 && (
            <Paper
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                overflow: 'hidden',
              }}
            >
              <ScrollArea mah={240}>
                {candidates.map(card => (
                  <Box
                    key={card.id}
                    className="candidate-row"
                    px="md"
                    py="md"
                    onClick={() => handleSelect(card)}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <Text size="sm" c="var(--text-h)" fw={600} style={{ fontFamily: 'var(--mono)' }}>
                      {card.word}
                    </Text>
                    {card.note && (
                      <Text size="xs" c="var(--text)" truncate>{card.note}</Text>
                    )}
                  </Box>
                ))}
              </ScrollArea>
            </Paper>
          )}
        </Box>

        {/* Edit form */}
        {selected && (
          <Stack gap="md">
            <Text fw={700} size="xl" c="var(--text-h)" style={{ fontFamily: 'var(--mono)' }}>
              {selected.word}
            </Text>

            <Box>
              <Text size="xs" c="var(--text)" mb={4}>Sentence</Text>
              <Textarea
                autosize
                minRows={2}
                value={sentence}
                onChange={e => setSentence(e.target.value)}
                styles={{
                  input: {
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-h)',
                    fontSize: 14,
                  },
                }}
              />
            </Box>

            <Box>
              <Text size="xs" c="var(--text)" mb={4}>Note</Text>
              <Textarea
                autosize
                minRows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                styles={{
                  input: {
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-h)',
                    fontSize: 14,
                  },
                }}
              />
            </Box>

            <Button
              size="lg"
              radius="md"
              fullWidth
              disabled={!isDirty}
              loading={saving}
              onClick={handleUpdate}
              style={{
                background: isDirty ? 'var(--accent)' : 'var(--card)',
                color: isDirty ? 'var(--bg)' : 'var(--text-dim)',
                border: isDirty ? 'none' : '1px solid var(--border)',
                fontWeight: 600,
              }}
            >
              Update
            </Button>
          </Stack>
        )}
      </Stack>
    </PageShell>
  );
}
