import { useState, useMemo } from 'react';
import {
  Container, Textarea, Button, Title, Stack, Paper,
  ActionIcon, Group, Text, Alert, Code, Box, ThemeIcon, Badge, ScrollArea
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconDatabaseImport, IconAlertCircle, IconCheck, IconFileText, IconAlertTriangle } from '@tabler/icons-react';
import { api } from '../api';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import type { Card } from '../types';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface ParsedLine {
  raw: string;
  word: string;
  note: string;
  sentence: string;
  malformed: boolean;
}

function parseLine(line: string): ParsedLine {
  const malformed = !line.includes('::');
  const [word = '', note = '', sentence = ''] = line.split('::').map(s => s.trim());
  return { raw: line, word: word || 'Untitled', note, sentence, malformed };
}

export default function BatchAddPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const parsedLines = useMemo<ParsedLine[]>(() => {
    if (!content.trim()) return [];
    return content.trim().split('\n').filter(l => l.trim() !== '').map(parseLine);
  }, [content]);

  const malformedCount = parsedLines.filter(l => l.malformed).length;
  const validCount = parsedLines.length;

  const handleBatchSubmit = async () => {
    if (!parsedLines.length) return;
    setLoading(true);

    const newCards: Card[] = parsedLines.map(({ word, note, sentence }) => ({
      id: nanoid(),
      word,
      sentence,
      note,
      due: '',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      lapses: 0,
      state: 0,
      last_review: '',
      lang: 'en',
      created_at: new Date().toISOString(),
      reps: 0,
      learning_steps: 0,
    }));

    try {
      await api.batchAddCards(newCards);
      notifications.show({
        title: 'Import Successful',
        message: `Successfully imported ${newCards.length} cards`,
        icon: <IconCheck size={16} />,
      });
      navigate('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      notifications.show({ title: 'Import Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1c1e' }}>
      <Container size="sm" maw={520} w="100%" py="xl" px="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Group gap="sm">
              <ActionIcon
                variant="subtle" onClick={() => navigate('/')} size="xl" radius="md" c="#aeaeb2"
                style={{ border: '1px solid #3a3a3c' }}
              >
                <IconArrowLeft size={24} />
              </ActionIcon>
              <Title order={2} c="#e8e3d9" style={{ letterSpacing: '-0.5px' }}>Batch Import</Title>
            </Group>
            <ThemeIcon variant="filled" size="lg" radius="md" style={{ backgroundColor: '#3a3a3c', color: '#e8e3d9' }}>
              <IconFileText size={20} />
            </ThemeIcon>
          </Group>

          <Alert
            variant="light" radius="lg" icon={<IconAlertCircle size={20} />}
            styles={{
              root: { backgroundColor: '#2c2c2e', border: '1px solid #3a3a3c' },
              title: { fontWeight: 700, color: '#e8e3d9' },
              icon: { color: '#aeaeb2' },
            }}
          >
            <Text size="xs" c="#aeaeb2" mb={4} fw={600}>Format (one per line):</Text>
            <Code block style={{ backgroundColor: '#1c1c1e', color: '#e8e3d9', fontSize: '11px', border: '1px solid #3a3a3c', fontFamily: MONO }}>
              word::note::sentence
            </Code>
          </Alert>

          <Paper
            radius={20} p="xl"
            style={{ background: '#2c2c2e', border: '1px solid #3a3a3c', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            <Stack gap="md">
              <Textarea
                placeholder={"Apple::蘋果::An apple a day.\nBanana::香蕉::I like bananas."}
                minRows={12}
                autosize
                value={content}
                onChange={(e) => setContent(e.target.value)}
                styles={{
                  input: {
                    fontFamily: MONO,
                    backgroundColor: '#1c1c1e',
                    color: '#e8e3d9',
                    border: '1px solid #3a3a3c',
                    padding: '16px',
                    fontSize: '14px',
                    borderRadius: '12px',
                  },
                  label: { color: '#e8e3d9', marginBottom: '8px', fontWeight: 600 },
                }}
              />

              {/* Live parse preview */}
              {parsedLines.length > 0 && (
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Badge variant="light" size="sm" style={{ background: '#3a3a3c', color: '#e8e3d9', fontFamily: MONO }}>
                        {validCount} cards
                      </Badge>
                      {malformedCount > 0 && (
                        <Badge
                          variant="light" size="sm"
                          leftSection={<IconAlertTriangle size={10} />}
                          style={{ background: '#3a3a3c', color: '#aeaeb2', fontFamily: MONO }}
                        >
                          {malformedCount} malformed
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="#aeaeb2">Separator: ::</Text>
                  </Group>

                  <ScrollArea h={Math.min(parsedLines.length * 44, 220)} type="auto">
                    <Stack gap={4}>
                      {parsedLines.map((line, i) => (
                        <Box
                          key={i}
                          px="sm" py={6}
                          style={{
                            borderRadius: 8,
                            background: line.malformed ? '#1c1c1e' : 'transparent',
                            border: `1px solid ${line.malformed ? '#aeaeb2' : '#3a3a3c'}`,
                          }}
                        >
                          {line.malformed ? (
                            <Group gap="xs" wrap="nowrap">
                              <IconAlertTriangle size={13} color="#aeaeb2" style={{ flexShrink: 0 }} />
                              <Text size="xs" c="#aeaeb2" style={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {line.raw}
                              </Text>
                              <Text size="xs" c="#636366" style={{ flexShrink: 0 }}>— missing ::</Text>
                            </Group>
                          ) : (
                            <Group gap="xs" wrap="nowrap">
                              <Text size="xs" fw={700} c="#e8e3d9" style={{ minWidth: 80, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: MONO }}>
                                {line.word}
                              </Text>
                              {line.note && (
                                <Text size="xs" c="#aeaeb2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                  {line.note}
                                </Text>
                              )}
                              {line.sentence && (
                                <Text size="xs" c="#aeaeb2" fs="italic" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                  "{line.sentence}"
                                </Text>
                              )}
                            </Group>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Box>
              )}

              <Button
                fullWidth size="xl" radius="md"
                leftSection={<IconDatabaseImport size={20} />}
                onClick={handleBatchSubmit}
                loading={loading}
                disabled={!parsedLines.length}
                style={{
                  background: parsedLines.length ? '#c79968' : '#2c2c2e',
                  border: 'none',
                  height: 56,
                  color: parsedLines.length ? '#1c1c1e' : '#636366',
                  fontWeight: 700,
                }}
              >
                Import {validCount > 0 ? `${validCount} Cards` : ''}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
