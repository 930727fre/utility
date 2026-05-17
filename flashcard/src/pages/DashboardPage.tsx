import { useQuery } from '@tanstack/react-query';
import {
  Title, Text, Paper, Group, Stack,
  Button, Box, Transition
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  IconFlame, IconCards, IconPlus,
  IconPlayerPlay, IconUpload, IconPencil, IconCheck
} from '@tabler/icons-react';
import PageShell from '../components/PageShell';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isStale, isFetching } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    staleTime: 30_000,
  });

  const isReady = !!stats && !(isStale && isFetching);

  const queueSize = stats && stats.due_count > 0 ? stats.due_count : stats?.new_available ?? 0;
  const phase = stats && stats.due_count > 0 ? 'review' : queueSize > 0 ? 'learning' : 'done';
  const isDone = phase === 'done';

  const phaseIcon = isDone
    ? <IconCheck size={52} color="var(--text)" style={{ flexShrink: 0 }} />
    : phase === 'review'
    ? <IconCards size={52} color="var(--text)" style={{ flexShrink: 0 }} />
    : <IconPlus size={52} color="var(--text)" style={{ flexShrink: 0 }} />;

  const phaseTag = isDone ? 'All Clear' : phase === 'review' ? 'Due Today' : 'New Cards';

  const ctaLabel = isDone
    ? 'All done for today'
    : `Start ${phase === 'learning' ? 'Learning' : 'Review'} (${queueSize} cards)`;

  return (
    <PageShell scroll="centered" maw={480}>
      <Transition mounted={isReady} transition="slide-up" duration={400}>
        {(styles) => (
          <Stack gap="md" style={styles}>

            {/* Streak */}
            <Paper radius={14} p="xl"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}>
              <Group gap="xl" wrap="nowrap">
                <IconFlame size={52} color="var(--text)" style={{ flexShrink: 0 }} />
                <Box>
                  <Text size="xs" fw={600} c="var(--text)" tt="uppercase" style={{ letterSpacing: '1.5px', fontFamily: 'var(--mono)' }}>
                    Current Streak
                  </Text>
                  <Title order={1} style={{ fontFamily: 'var(--mono)', fontSize: 38, color: 'var(--text-h)', lineHeight: 1.1 }}>
                    {stats?.streak_count}{' '}
                    <Text span size="lg" c="var(--text)" fw={400}>Days</Text>
                  </Title>
                </Box>
              </Group>
            </Paper>

            {/* Phase */}
            <Paper radius={14} p="xl"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}>
              <Group gap="xl" wrap="nowrap">
                {phaseIcon}
                <Box>
                  <Text size="xs" fw={600} c="var(--text)" tt="uppercase" style={{ letterSpacing: '1.5px', fontFamily: 'var(--mono)' }}>
                    {phaseTag}
                  </Text>
                  {isDone ? (
                    <Title order={2} style={{ fontFamily: 'var(--mono)', fontSize: 38, color: 'var(--text)', lineHeight: 1.1 }}>
                      Done
                    </Title>
                  ) : (
                    <Title order={2} style={{ fontFamily: 'var(--mono)', fontSize: 38, color: 'var(--text-h)', lineHeight: 1.1 }}>
                      {queueSize}{' '}
                      <Text span size="lg" c="var(--text)" fw={400}>cards</Text>
                    </Title>
                  )}
                </Box>
              </Group>
            </Paper>

            {/* Actions */}
            <Group grow gap="sm">
              <Button
                size="lg"
                radius={8}
                disabled={isDone}
                onClick={() => !isDone && navigate('/review')}
                title={ctaLabel}
                aria-label={ctaLabel}
                style={{
                  background: isDone ? 'var(--card)' : 'var(--accent)',
                  color: isDone ? 'var(--text-dim)' : 'var(--bg)',
                  border: isDone ? '1px solid var(--border)' : 'none',
                  height: 54,
                }}
              >
                <IconPlayerPlay size={24} fill="currentColor" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                radius={8}
                onClick={() => navigate('/batch-add')}
                title="Batch Import"
                aria-label="Batch Import"
                style={{ borderColor: 'var(--border)', color: 'var(--text-h)', height: 54, background: 'transparent' }}
              >
                <IconUpload size={22} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                radius={8}
                onClick={() => navigate('/edit')}
                title="Edit"
                aria-label="Edit"
                style={{ borderColor: 'var(--border)', color: 'var(--text-h)', height: 54, background: 'transparent' }}
              >
                <IconPencil size={22} />
              </Button>
            </Group>

          </Stack>
        )}
      </Transition>
    </PageShell>
  );
}
