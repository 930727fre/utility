import { useState } from 'react';
import {
  TextInput, Stack, Paper, Text, Textarea,
  Button, ActionIcon, Group, Title, ThemeIcon, Box, ScrollArea
} from '@mantine/core';
import PageShell from '../components/PageShell';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconSearch, IconEdit, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Card } from '../types';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default function EditPage() {
  const navigate = useNavigate();

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
      notifications.show({ message: `${selected.word} updated`, icon: <IconCheck size={14} /> });
    } catch {
      notifications.show({ title: 'Update failed', message: 'Check network connection' });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = selected && (sentence !== selected.sentence || note !== selected.note);

  return (
    <PageShell size="xs">
      <Stack gap="lg">
        <Group justify="space-between">
          <Group gap="sm">
            <ActionIcon
              variant="subtle" onClick={() => navigate('/')} size="xl" radius="md" c="#aeaeb2"
              style={{ border: '1px solid #3a3a3c' }}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Title order={2} c="#e8e3d9" style={{ letterSpacing: '-0.5px' }}>Edit</Title>
          </Group>
          <ThemeIcon variant="filled" size="lg" radius="md" style={{ backgroundColor: '#3a3a3c', color: '#e8e3d9' }}>
            <IconEdit size={20} />
          </ThemeIcon>
        </Group>

        {/* Search */}
        <Box style={{ position: 'relative' }}>
          <TextInput
            placeholder="Search a word..."
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            styles={{
              input: {
                backgroundColor: '#2c2c2e',
                border: '1px solid #3a3a3c',
                color: '#e8e3d9',
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
                background: '#2c2c2e',
                border: '1px solid #3a3a3c',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                overflow: 'hidden',
              }}
            >
              <ScrollArea mah={240}>
                {candidates.map(card => (
                  <Box
                    key={card.id}
                    px="md"
                    py="md"
                    onClick={() => handleSelect(card)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #3a3a3c' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3c')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Text size="sm" c="#e8e3d9" fw={600} style={{ fontFamily: MONO }}>
                      {card.word}
                    </Text>
                    {card.note && (
                      <Text size="xs" c="#aeaeb2" truncate>{card.note}</Text>
                    )}
                  </Box>
                ))}
              </ScrollArea>
            </Paper>
          )}
        </Box>

        {/* Edit form */}
        {selected && (
          <Paper
            p="lg"
            radius={16}
            style={{
              background: '#2c2c2e',
              border: '1px solid #3a3a3c',
            }}
          >
            <Stack gap="md">
              <Text fw={700} size="xl" c="#e8e3d9" style={{ fontFamily: MONO }}>
                {selected.word}
              </Text>

              <Box>
                <Text size="xs" c="#aeaeb2" mb={4}>Sentence</Text>
                <Textarea
                  autosize
                  minRows={2}
                  value={sentence}
                  onChange={e => setSentence(e.target.value)}
                  styles={{
                    input: {
                      backgroundColor: '#1c1c1e',
                      border: '1px solid #3a3a3c',
                      color: '#e8e3d9',
                      fontSize: 14,
                    },
                  }}
                />
              </Box>

              <Box>
                <Text size="xs" c="#aeaeb2" mb={4}>Note</Text>
                <Textarea
                  autosize
                  minRows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  styles={{
                    input: {
                      backgroundColor: '#1c1c1e',
                      border: '1px solid #3a3a3c',
                      color: '#e8e3d9',
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
                  background: isDirty ? '#c79968' : '#2c2c2e',
                  color: isDirty ? '#1c1c1e' : '#636366',
                  border: isDirty ? 'none' : '1px solid #3a3a3c',
                  fontWeight: 600,
                }}
              >
                Update
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageShell>
  );
}
