import { Database, Trash2 } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { Button, type ButtonProps } from '../ui/Primitives';

/**
 * Single control that flips between clearing the workspace and re-seeding it.
 *
 * The label is driven by whether records actually exist rather than by which
 * button was last pressed, so deleting the last idea or ticket by hand flips it
 * to "Load demo data" too.
 */
export function DemoDataButton({
  size = 'sm',
  className,
}: {
  size?: ButtonProps['size'];
  className?: string;
}) {
  const { state, dispatch, pushToast } = useApp();

  const hasData =
    state.issues.length > 0 || state.ideas.length > 0 || state.tickets.length > 0;

  if (!hasData) {
    return (
      <Button
        variant="success"
        size={size}
        className={className}
        icon={<Database className="h-3.5 w-3.5" />}
        onClick={() => {
          dispatch({ type: 'RESET' });
          pushToast({
            title: 'Demo data loaded',
            description: 'Signals, ideas and roadmap tickets restored.',
            tone: 'success',
          });
        }}
      >
        Load demo data
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size={size}
      className={className}
      icon={<Trash2 className="h-3.5 w-3.5" />}
      onClick={() => {
        const counts = [
          `${state.issues.length} signals`,
          `${state.ideas.length} ideas`,
          `${state.tickets.length} tickets`,
        ].join(', ');
        if (!window.confirm(`Clear the workspace? This removes ${counts}.`)) return;
        dispatch({ type: 'CLEAR_DATA' });
        pushToast({
          title: 'Workspace cleared',
          description: 'Load the demo data again from the same button.',
          tone: 'info',
        });
      }}
    >
      Clear data
    </Button>
  );
}
