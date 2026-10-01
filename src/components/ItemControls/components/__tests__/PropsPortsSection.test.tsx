/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { PortsTable, PropsTable } from '../PropsPortsSection';

// Props and ports shown and edited as tables in the inspector.

const blurWith = (label: string, text: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
};

describe('PropsTable', () => {
  const props = { ip: '10.0.0.5', ports: 8, poe: true };

  test('shows every prop, a yes/no as words when read-only', () => {
    render(<PropsTable props={props} editable={false} onChange={jest.fn()} />);
    const table = screen.getByTestId('prop-table');
    expect(table.textContent).toBe('ip10.0.0.5ports8poeYes');
    expect(screen.queryByLabelText('New prop key')).toBeNull();
  });

  test('renders nothing read-only with no props', () => {
    const { container } = render(
      <PropsTable props={undefined} editable={false} onChange={jest.fn()} />
    );
    expect(container.textContent).toBe('');
  });

  test('a value keeps its type: a number stays a number', () => {
    const onChange = jest.fn();
    render(<PropsTable props={props} editable onChange={onChange} />);
    blurWith('prop value ports', '24');
    expect(onChange).toHaveBeenLastCalledWith({
      ip: '10.0.0.5',
      ports: 24,
      poe: true
    });
  });

  test('a number field refuses text without committing it', () => {
    const onChange = jest.fn();
    render(<PropsTable props={props} editable onChange={onChange} />);
    const input = screen.getByLabelText('prop value ports');
    fireEvent.change(input, { target: { value: 'eight' } });
    expect(screen.getByText('A number')).toBeTruthy();
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('a yes/no is a checkbox', () => {
    const onChange = jest.fn();
    render(<PropsTable props={props} editable onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('prop value poe'));
    expect(onChange).toHaveBeenLastCalledWith({
      ip: '10.0.0.5',
      ports: 8,
      poe: false
    });
  });

  test('renaming a key keeps its place and value; a taken key is refused', () => {
    const onChange = jest.fn();
    render(<PropsTable props={props} editable onChange={onChange} />);
    blurWith('prop key ip', 'poe');
    expect(onChange).not.toHaveBeenCalled();
    blurWith('prop key ip', 'address');
    expect(Object.entries(onChange.mock.calls[0][0])).toEqual([
      ['address', '10.0.0.5'],
      ['ports', 8],
      ['poe', true]
    ]);
  });

  test('adds a prop as text, and removing the last clears props', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <PropsTable props={undefined} editable onChange={onChange} />
    );
    fireEvent.change(screen.getByLabelText('New prop key'), {
      target: { value: 'serial' }
    });
    fireEvent.change(screen.getByLabelText('New prop value'), {
      target: { value: '00123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenLastCalledWith({ serial: '00123' });

    rerender(
      <PropsTable props={{ serial: '00123' }} editable onChange={onChange} />
    );
    fireEvent.click(screen.getByLabelText('Remove prop serial'));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  test('no add row at the 50-prop limit', () => {
    const full = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => {
        return [`k${i}`, i];
      })
    );
    render(<PropsTable props={full} editable onChange={jest.fn()} />);
    expect(screen.queryByLabelText('New prop key')).toBeNull();
  });
});

describe('PortsTable', () => {
  const ports = [
    {
      id: 'eth1',
      name: 'Port 1',
      kind: 'ethernet-copper',
      props: { role: 'downlink' }
    },
    { id: 'psu', kind: 'odd-medium' }
  ];

  test('shows id, name and medium by name when read-only', () => {
    render(<PortsTable ports={ports} editable={false} onChange={jest.fn()} />);
    const rows = screen.getByTestId('ports-table').querySelectorAll('tbody tr');
    expect(rows[0].textContent).toBe('eth1Port 1Ethernet (copper)');
    expect(rows[2].textContent).toBe('psuodd-medium');
    expect(screen.queryByLabelText('Remove port eth1')).toBeNull();
  });

  test("a port's props open under it", () => {
    render(<PortsTable ports={ports} editable={false} onChange={jest.fn()} />);
    fireEvent.click(screen.getByLabelText('Props of port eth1'));
    expect(screen.getByTestId('port eth1 prop-table').textContent).toBe(
      'roledownlink'
    );
  });

  test('editing a name, clearing it drops the field', () => {
    const onChange = jest.fn();
    render(<PortsTable ports={ports} editable onChange={onChange} />);
    blurWith('Port eth1 name', 'Uplink');
    expect(onChange.mock.calls[0][0][0]).toEqual({
      id: 'eth1',
      name: 'Uplink',
      kind: 'ethernet-copper',
      props: { role: 'downlink' }
    });
    blurWith('Port eth1 name', '');
    expect(onChange.mock.calls[1][0][0]).toEqual({
      id: 'eth1',
      kind: 'ethernet-copper',
      props: { role: 'downlink' }
    });
  });

  test("editing a port's props writes them to that port only", () => {
    const onChange = jest.fn();
    render(<PortsTable ports={ports} editable onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Props of port eth1'));
    fireEvent.click(screen.getByLabelText('Remove port eth1 prop role'));
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'eth1', name: 'Port 1', kind: 'ethernet-copper' },
      { id: 'psu', kind: 'odd-medium' }
    ]);
  });

  test('adds a port with a valid, unused id; removes one', () => {
    const onChange = jest.fn();
    render(<PortsTable ports={ports} editable onChange={onChange} />);
    const input = screen.getByLabelText('New port id');
    const add = screen.getByRole('button', { name: 'Add port' });
    fireEvent.change(input, { target: { value: 'eth1' } });
    expect(screen.getByText('That id is taken')).toBeTruthy();
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'eth 2' } });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'eth2' } });
    fireEvent.click(add);
    expect(onChange).toHaveBeenLastCalledWith([...ports, { id: 'eth2' }]);

    fireEvent.click(screen.getByLabelText('Remove port psu'));
    expect(onChange).toHaveBeenLastCalledWith([ports[0]]);
  });
});
