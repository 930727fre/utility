import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Title, Text, Paper, Group, Stack,
  Button, ThemeIcon, Skeleton, Box, Badge, Progress
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  IconFlame, IconCards, IconPlus,
  IconPlayerPlay, IconUpload, IconList, IconCheck
} from '@tabler/icons-react';
import PageShell from '../components/PageShell';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const PHASE_CONFIG = {
  done: {
    tag: 'All Clear',
    icon: <IconCheck size={22} />,
    badge: 'Done',
    button: 'All done for today!',
    disabled: true,
  },
  review: {
    tag: 'Current Task: Review',
    icon: <IconCards size={22} />,
    badge: 'Phase 1',
    button: null,
    disabled: false,
  },
  learning: {
    tag: "Today's New Cards",
    icon: <IconPlus size={22} />,
    badge: 'Phase 2',
    button: null,
    disabled: false,
  },
} as const;

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    staleTime: 30_000,
  });

  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['queue'], queryFn: api.getQueue, staleTime: 60_000 });
  }, [queryClient]);

  if (!stats) {
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
            <Text c="#aeaeb2" size="xs" fw={700} style={{ letterSpacing: '1.5px', fontFamily: MONO }}>
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
  const cfg = PHASE_CONFIG[phase];

  const phaseTitle = phase === 'done'
    ? <Text fw={600} size="lg" c="#e8e3d9">No tasks for today</Text>
    : phase === 'review'
    ? <Text fw={600} size="lg" c="#e8e3d9"><span style={{ fontFamily: MONO, fontSize: 20 }}>{queueSize}</span> cards to review</Text>
    : <Text fw={600} size="lg" c="#e8e3d9"><span style={{ fontFamily: MONO, fontSize: 20 }}>{queueSize}</span> new cards to learn</Text>;

  const buttonLabel = cfg.button ?? `Start ${phase === 'learning' ? 'Learning' : 'Review'} (${queueSize} cards)`;

  return (
    <PageShell scroll="centered" maw={480}>
      <Stack gap="md">

          {/* Streak */}
          <Paper radius={14} p="xl"
            style={{
              background: '#2c2c2e',
              border: '1px solid #3a3a3c',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}>
            <Group gap="xl" wrap="nowrap">
              <IconFlame size={52} color="#aeaeb2" style={{ flexShrink: 0 }} />
              <Box>
                <Text size="xs" fw={600} c="#aeaeb2" tt="uppercase" style={{ letterSpacing: '1.5px', fontFamily: MONO }}>
                  Current Streak
                </Text>
                <Title order={1} style={{ fontFamily: MONO, fontSize: 38, color: '#e8e3d9', lineHeight: 1.1 }}>
                  {stats.streak_count}{' '}
                  <Text span size="lg" c="#aeaeb2" fw={400}>Days</Text>
                </Title>
              </Box>
            </Group>
          </Paper>

          {/* Phase */}
          <Paper radius={14} p="lg"
            style={{
              background: '#2c2c2e',
              border: '1px solid #3a3a3c',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}>
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
                <ThemeIcon
                  size={44} radius={10} variant="filled"
                  style={{ backgroundColor: '#3a3a3c', color: '#e8e3d9', flexShrink: 0 }}
                >
                  {cfg.icon}
                </ThemeIcon>
                <Box style={{ minWidth: 0, overflow: 'hidden' }}>
                  <Text size="xs" fw={600} tt="uppercase" style={{ letterSpacing: '1.2px', color: '#aeaeb2', marginBottom: 3, fontFamily: MONO }}>
                    {cfg.tag}
                  </Text>
                  {phaseTitle}
                </Box>
              </Group>
              <Badge
                style={{
                  background: '#3a3a3c',
                  color: '#e8e3d9',
                  border: 'none',
                  flexShrink: 0,
                  fontFamily: MONO,
                }}
              >
                {cfg.badge}
              </Badge>
            </Group>
          </Paper>

          {/* Primary button */}
          <Button
            size="lg"
            radius={14}
            disabled={cfg.disabled}
            onClick={() => !cfg.disabled && navigate('/review')}
            leftSection={<IconPlayerPlay size={20} fill="currentColor" />}
            style={{
              background: cfg.disabled ? '#2c2c2e' : '#c79968',
              color: cfg.disabled ? '#636366' : '#1c1c1e',
              border: cfg.disabled ? '1px solid #3a3a3c' : 'none',
              height: 54,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {buttonLabel}
          </Button>

          {/* Secondary actions */}
          <Group grow gap="sm">
            <Button
              variant="outline"
              size="md"
              radius={8}
              leftSection={<IconUpload size={18} />}
              onClick={() => navigate('/batch-add')}
              style={{ borderColor: '#3a3a3c', color: '#e8e3d9', height: 48, background: 'transparent' }}
            >
              Batch Import
            </Button>
            <Button
              variant="outline"
              size="md"
              radius={8}
              leftSection={<IconList size={18} />}
              onClick={() => navigate('/edit')}
              style={{ borderColor: '#3a3a3c', color: '#e8e3d9', height: 48, background: 'transparent' }}
            >
              Edit
            </Button>
          </Group>

      </Stack>
    </PageShell>
  );
}
