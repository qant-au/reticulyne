import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { MEDIA } from 'src/catalogue/media';
import { useScene } from 'src/hooks/useScene';
import { useModelItem } from 'src/hooks/useModelItem';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { ModelItem } from 'src/types';
import { PanelSection } from 'src/vendor/accurona-ui';
import { SCENE_LIMITS } from 'src/vendor/accurona-core/scene/schema';

// lw-084: an object's props and ports as tables (docs/scene-format.md,
// "Objects": props are flat scalars "so that every tool can show and edit it
// as a table without knowing what the keys mean"). A value keeps its type:
// a yes/no is a checkbox, a number stays a number while it reads as one.
// New props are text. A port's id is fixed once it exists, because a
// connection names it; removing a port a connection uses is allowed and
// shows as a topology warning, never refused.

type Props = Record<string, string | number | boolean>;
type Port = NonNullable<ModelItem['ports']>[number];

const ID = /^[A-Za-z0-9_-]{1,64}$/;

const cellSx = { px: 0.5, py: 0.25, verticalAlign: 'top' } as const;

/**
 * A text field that commits on blur or Enter and reverts on Escape, so a key
 * being renamed never collides with itself half-typed.
 */
const CommitField = ({
  value,
  label,
  validate,
  onCommit,
  maxLength
}: {
  value: string;
  label: string;
  validate?: (text: string) => string | null;
  onCommit: (text: string) => void;
  maxLength?: number;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const error = draft !== null && validate ? validate(draft) : null;
  const commit = () => {
    if (draft !== null && draft !== value && !error) onCommit(draft);
    setDraft(null);
  };
  return (
    <TextField
      size="small"
      fullWidth
      value={text}
      error={Boolean(error)}
      helperText={error ?? undefined}
      slotProps={{ htmlInput: { 'aria-label': label, maxLength } }}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
};

const valueText = (value: string | number | boolean) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

/** A flat props table. `onChange(undefined)` when the last prop goes. */
export const PropsTable = ({
  props,
  editable,
  onChange,
  label = 'prop'
}: {
  props: Props | undefined;
  editable: boolean;
  onChange: (next: Props | undefined) => void;
  label?: string;
}) => {
  const entries = Object.entries(props ?? {});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const keyError = (key: string, own?: string) => {
    if (key.length === 0) return 'A key is needed';
    if (key.length > SCENE_LIMITS.NAME)
      return `At most ${SCENE_LIMITS.NAME} characters`;
    if (key !== own && props && key in props) return 'That key is taken';
    return null;
  };
  const write = (next: [string, string | number | boolean][]) => {
    onChange(next.length ? Object.fromEntries(next) : undefined);
  };

  if (!editable && entries.length === 0) return null;

  return (
    <Box>
      {entries.length > 0 && (
        <Table size="small" data-testid={`${label}-table`}>
          <TableBody>
            {entries.map(([key, value]) => {
              return (
                <TableRow key={key}>
                  <TableCell sx={{ ...cellSx, width: '40%' }}>
                    {editable ? (
                      <CommitField
                        value={key}
                        label={`${label} key ${key}`}
                        maxLength={SCENE_LIMITS.NAME}
                        validate={(text) => {
                          return keyError(text, key);
                        }}
                        onCommit={(text) => {
                          write(
                            entries.map(([k, v]) => {
                              return k === key ? [text, v] : [k, v];
                            })
                          );
                        }}
                      />
                    ) : (
                      <Typography variant="body2">{key}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {!editable && (
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: 'break-word' }}
                      >
                        {valueText(value)}
                      </Typography>
                    )}
                    {editable && typeof value === 'boolean' && (
                      <Checkbox
                        size="small"
                        checked={value}
                        slotProps={{
                          input: { 'aria-label': `${label} value ${key}` }
                        }}
                        onChange={(e) => {
                          write(
                            entries.map(([k, v]) => {
                              return k === key ? [k, e.target.checked] : [k, v];
                            })
                          );
                        }}
                      />
                    )}
                    {editable && typeof value !== 'boolean' && (
                      <CommitField
                        value={String(value)}
                        label={`${label} value ${key}`}
                        maxLength={SCENE_LIMITS.DESCRIPTION}
                        validate={(text) => {
                          return typeof value === 'number' &&
                            (text.trim() === '' ||
                              !Number.isFinite(Number(text)))
                            ? 'A number'
                            : null;
                        }}
                        onCommit={(text) => {
                          const next =
                            typeof value === 'number' ? Number(text) : text;
                          write(
                            entries.map(([k, v]) => {
                              return k === key ? [k, next] : [k, v];
                            })
                          );
                        }}
                      />
                    )}
                  </TableCell>
                  {editable && (
                    <TableCell sx={{ ...cellSx, width: 32 }}>
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          aria-label={`Remove ${label} ${key}`}
                          onClick={() => {
                            write(
                              entries.filter(([k]) => {
                                return k !== key;
                              })
                            );
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {editable && entries.length < SCENE_LIMITS.PROPS && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 1, alignItems: 'flex-start' }}
        >
          <TextField
            size="small"
            placeholder="Key"
            value={newKey}
            error={newKey !== '' && Boolean(keyError(newKey))}
            slotProps={{
              htmlInput: {
                'aria-label': `New ${label} key`,
                maxLength: SCENE_LIMITS.NAME
              }
            }}
            onChange={(e) => {
              setNewKey(e.target.value);
            }}
          />
          <TextField
            size="small"
            placeholder="Value"
            value={newValue}
            slotProps={{
              htmlInput: {
                'aria-label': `New ${label} value`,
                maxLength: SCENE_LIMITS.DESCRIPTION
              }
            }}
            onChange={(e) => {
              setNewValue(e.target.value);
            }}
          />
          <Button
            size="small"
            disabled={Boolean(keyError(newKey))}
            onClick={() => {
              write([...entries, [newKey, newValue]]);
              setNewKey('');
              setNewValue('');
            }}
          >
            Add
          </Button>
        </Stack>
      )}
    </Box>
  );
};

const mediumName = (kind: string | undefined) => {
  if (!kind) return '';
  return (
    MEDIA.find((m) => {
      return m.id === kind;
    })?.name ?? kind
  );
};

/** An object's ports: id, name and medium, each with its own props. */
export const PortsTable = ({
  ports,
  editable,
  onChange
}: {
  ports: Port[] | undefined;
  editable: boolean;
  onChange: (next: Port[] | undefined) => void;
}) => {
  const list = ports ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const [newId, setNewId] = useState('');

  const write = (next: Port[]) => {
    onChange(next.length ? next : undefined);
  };
  const update = (id: string, fields: Partial<Port>) => {
    write(
      list.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...fields };
        (Object.keys(fields) as (keyof Port)[]).forEach((k) => {
          if (next[k] === undefined || next[k] === '') delete next[k];
        });
        return next;
      })
    );
  };
  const idError = (id: string) => {
    if (!ID.test(id)) return 'An id is 1-64 of A-Z a-z 0-9 _ -';
    if (
      list.some((p) => {
        return p.id === id;
      })
    )
      return 'That id is taken';
    return null;
  };

  if (!editable && list.length === 0) return null;

  return (
    <Box>
      {list.length > 0 && (
        <Table size="small" data-testid="ports-table">
          <TableHead>
            <TableRow>
              <TableCell sx={cellSx}>Id</TableCell>
              <TableCell sx={cellSx}>Name</TableCell>
              <TableCell sx={cellSx}>Medium</TableCell>
              <TableCell sx={{ ...cellSx, width: editable ? 64 : 32 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((port) => {
              const expanded = open === port.id;
              const known = MEDIA.some((m) => {
                return m.id === port.kind;
              });
              return [
                <TableRow key={port.id}>
                  <TableCell sx={cellSx}>
                    <Typography variant="body2">{port.id}</Typography>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {editable ? (
                      <CommitField
                        value={port.name ?? ''}
                        label={`Port ${port.id} name`}
                        maxLength={SCENE_LIMITS.NAME}
                        onCommit={(text) => {
                          update(port.id, { name: text });
                        }}
                      />
                    ) : (
                      <Typography variant="body2">{port.name}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {editable ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={port.kind ?? ''}
                        slotProps={{
                          htmlInput: { 'aria-label': `Port ${port.id} medium` }
                        }}
                        onChange={(e) => {
                          update(port.id, { kind: e.target.value });
                        }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {port.kind && !known && (
                          <MenuItem value={port.kind}>{port.kind}</MenuItem>
                        )}
                        {MEDIA.map((m) => {
                          return (
                            <MenuItem key={m.id} value={m.id}>
                              {m.name}
                            </MenuItem>
                          );
                        })}
                      </TextField>
                    ) : (
                      <Typography variant="body2">
                        {mediumName(port.kind)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>
                    <Tooltip title={expanded ? 'Hide props' : 'Props'}>
                      <IconButton
                        size="small"
                        aria-label={`Props of port ${port.id}`}
                        aria-expanded={expanded}
                        onClick={() => {
                          setOpen(expanded ? null : port.id);
                        }}
                      >
                        {expanded ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    {editable && (
                      <Tooltip title="Remove port">
                        <IconButton
                          size="small"
                          aria-label={`Remove port ${port.id}`}
                          onClick={() => {
                            write(
                              list.filter((p) => {
                                return p.id !== port.id;
                              })
                            );
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>,
                <TableRow key={`${port.id}-props`}>
                  <TableCell
                    colSpan={4}
                    sx={{ p: 0, borderBottom: expanded ? undefined : 'none' }}
                  >
                    <Collapse in={expanded} unmountOnExit>
                      <Box sx={{ pl: 2, py: 1 }}>
                        {!editable && !port.props ? (
                          <Typography variant="body2" color="text.secondary">
                            No props
                          </Typography>
                        ) : (
                          <PropsTable
                            label={`port ${port.id} prop`}
                            props={port.props}
                            editable={editable}
                            onChange={(next) => {
                              update(port.id, { props: next });
                            }}
                          />
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              ];
            })}
          </TableBody>
        </Table>
      )}
      {editable && list.length < SCENE_LIMITS.PORTS && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 1, alignItems: 'flex-start' }}
        >
          <TextField
            size="small"
            placeholder="Port id, e.g. eth1"
            value={newId}
            error={newId !== '' && Boolean(idError(newId))}
            helperText={
              newId !== '' ? (idError(newId) ?? undefined) : undefined
            }
            slotProps={{
              htmlInput: { 'aria-label': 'New port id', maxLength: 64 }
            }}
            onChange={(e) => {
              setNewId(e.target.value);
            }}
          />
          <Button
            size="small"
            disabled={Boolean(idError(newId))}
            onClick={() => {
              write([...list, { id: newId }]);
              setNewId('');
            }}
          >
            Add port
          </Button>
        </Stack>
      )}
    </Box>
  );
};

/** The object's props and ports, as two inspector sections. */
export const PropsPortsSection = ({ itemId }: { itemId: string }) => {
  const modelItem = useModelItem(itemId);
  const { updateModelItem } = useScene();
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });
  if (!modelItem) return null;
  const hasProps = Object.keys(modelItem.props ?? {}).length > 0;
  const hasPorts = (modelItem.ports ?? []).length > 0;

  return (
    <>
      {(editable || hasProps) && (
        <PanelSection title="Props">
          <PropsTable
            props={modelItem.props}
            editable={editable}
            onChange={(props) => {
              updateModelItem(itemId, { props });
            }}
          />
        </PanelSection>
      )}
      {(editable || hasPorts) && (
        <PanelSection title="Ports">
          <PortsTable
            ports={modelItem.ports}
            editable={editable}
            onChange={(ports) => {
              updateModelItem(itemId, { ports });
            }}
          />
        </PanelSection>
      )}
    </>
  );
};
