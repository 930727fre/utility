import { useQuery } from '@tanstack/react-query';
import {
  Title, Text, Paper, Group, Stack,
  Button, Skeleton, Box, Progress
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

  if (!stats || (isStale && isFetching)) {
    return (
      <PageShell scroll="centered" maw={480}>
        <Stack gap="md">
          <Skeleton height={120} radius={14} animate />
          <Skeleton height={90} radius={14} animate />
          <Skeleton height={56} radius={14} animate />
          <Group grow gap="sm">
            <Skeleton height={48} radius={8} animate />
            <Skeleton height={48} radius={8} animate />
          </Group>
          <Stack gap={4} align="center" mt="md">
            <Text c="var(--text)" size="xs" fw={700} style={{ letterSpacing: '1.5px', fontFamily: 'var(--mono)' }}>
              SYNCING WITH BACKEND
            </Text>
            <Progress value={100} w={120} size="xs" radius="xl" animated color="gray" />
          </Stack>
        </Stack>
      </PageShell>
    );
  }

  const queueSize = stats.due_count > 0 ? stats.due_count : stats.new_available;
  const phase = stats.due_count > 0 ? 'review' : queueSize > 0 ? 'learning' : 'done';
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
      <Stack gap="md">

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
                  {stats.streak_count}{' '}
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
    </PageShell>
  );
}
