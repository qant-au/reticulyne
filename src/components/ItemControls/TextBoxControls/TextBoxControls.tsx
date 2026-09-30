import { useEffect, useRef } from 'react';
import { ProjectionOrientationEnum } from 'src/types';
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Slider
} from '@mui/material';
import TextRotationNoneIcon from '@mui/icons-material/TextRotationNone';
import { useTextBox } from 'src/hooks/useTextBox';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getIsoProjectionCss } from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { useProjection } from 'src/hooks/useProjection';
import { NAME_MAX } from 'src/schemas/common';
import { DeleteButton } from '../components/DeleteButton';
import { LayerOrderSection } from '../components/LayerOrderSection';
import { LayerSection } from '../components/LayerSection';
import { Panel, PanelHeader, PanelSection } from 'src/vendor/accurona-ui';

interface Props {
  id: string;
}

export const TextBoxControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const textBox = useTextBox(id);
  const projection = useProjection();
  // Only a text box just placed, or opened with Enter, takes focus:
  // selecting an existing one must leave Delete deleting the box, not its
  // text. An effect rather than autoFocus, which acts only on mount: Enter
  // on a text box reached with Tab finds this panel already open.
  const focusRequested = useUiStateStore((state) => {
    return state.focusTextBoxId === id;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateTextBox, deleteTextBox } = useScene();
  const hasTextBox = Boolean(textBox);
  useEffect(() => {
    if (!focusRequested || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.select();
    uiStateActions.setFocusTextBoxId(null);
  }, [focusRequested, hasTextBox, uiStateActions]);

  // A text box left empty is invisible but stayed in the diagram, and in
  // every export. As in Excalidraw, leaving it empty removes it.
  const leave = useRef({ content: textBox?.content, remove: deleteTextBox });
  useEffect(() => {
    leave.current = { content: textBox?.content, remove: deleteTextBox };
  }, [textBox?.content, deleteTextBox]);
  useEffect(() => {
    return () => {
      const { content, remove } = leave.current;
      if (content === undefined || content.trim() !== '') return;
      try {
        remove(id);
      } catch {
        // Already gone: the inspector closed because it was deleted.
      }
    };
  }, [id]);

  if (!textBox) return null;

  return (
    <Panel header={<PanelHeader title="Edit text" />}>
      <PanelSection>
        <TextField
          label="Text"
          slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
          inputRef={inputRef}
          onKeyDown={(e) => {
            // Esc hands the keyboard back to the canvas; before, it did
            // nothing and the next tool key was typed into the text.
            if (e.key === 'Escape') (e.target as HTMLElement).blur();
          }}
          value={textBox.content}
          onChange={(e) => {
            updateTextBox(textBox.id, { content: e.target.value as string });
          }}
        />
      </PanelSection>
      <PanelSection title="Text size">
        <Slider
          marks
          step={0.3}
          min={0.3}
          max={0.9}
          value={textBox.fontSize}
          onChange={(_e, newSize) => {
            // Keyboard steps accumulate float error (0.8999…).
            updateTextBox(textBox.id, {
              fontSize: Math.round((newSize as number) * 100) / 100
            });
          }}
        />
      </PanelSection>
      <PanelSection title="Alignment">
        <ToggleButtonGroup
          value={textBox.orientation}
          exclusive
          onChange={(_e, orientation) => {
            if (textBox.orientation === orientation || orientation === null)
              return;

            updateTextBox(textBox.id, { orientation });
          }}
        >
          <ToggleButton value={ProjectionOrientationEnum.X}>
            <TextRotationNoneIcon
              sx={{ transform: getIsoProjectionCss(undefined, projection) }}
            />
          </ToggleButton>
          <ToggleButton value={ProjectionOrientationEnum.Y}>
            <TextRotationNoneIcon
              sx={{
                transform: `scale(-1, 1) ${getIsoProjectionCss(undefined, projection)} scale(-1, 1)`
              }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </PanelSection>
      <LayerSection targets={[{ type: 'TEXTBOX', id }]} />
      <LayerOrderSection targets={[{ type: 'TEXTBOX', id }]} />
      <PanelSection>
        <Box>
          <DeleteButton
            onClick={() => {
              uiStateActions.setItemControls(null);
              deleteTextBox(textBox.id);
            }}
          />
        </Box>
      </PanelSection>
    </Panel>
  );
};
