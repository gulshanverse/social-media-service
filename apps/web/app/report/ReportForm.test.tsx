import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportForm } from '../../components/ReportForm';
import { reportConfession } from '../../lib/api';

vi.mock('../../lib/api', () => ({ reportConfession: vi.fn() }));

describe('ReportForm', () => {
  beforeEach(() => {
    vi.mocked(reportConfession).mockReset();
    window.history.replaceState({}, '', '/report');
  });

  it('prefills a valid public confession ID and ignores an untrusted query parameter', () => {
    window.history.replaceState(
      {},
      '',
      '/report?confession=https%3A%2F%2Fwww.confessions.live%2Fconfessions%2Fpub-123',
    );
    const { unmount } = render(<ReportForm />);
    expect(screen.getByLabelText('Public confession link or ID')).toHaveValue('pub-123');
    unmount();
    window.history.replaceState(
      {},
      '',
      '/report?confession=https%3A%2F%2Fevil.example%2Fconfessions%2Fsecret',
    );
    render(<ReportForm />);
    expect(screen.getByLabelText('Public confession link or ID')).toHaveValue('');
  });

  it('requires and trims details for Other while leaving existing reasons unchanged', async () => {
    vi.mocked(reportConfession).mockResolvedValue({ status: 'RECEIVED', message: 'received' });
    render(<ReportForm />);
    const link = screen.getByLabelText('Public confession link or ID');
    fireEvent.change(link, { target: { value: 'public-1' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'OTHER' } });
    expect(screen.getByLabelText('Explain your concern')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please explain why');
    fireEvent.change(screen.getByLabelText('Explain your concern'), {
      target: { value: '  context  ' },
    });
    expect(screen.getByText('11/1000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() =>
      expect(reportConfession).toHaveBeenCalledWith('public-1', 'OTHER', 'context'),
    );
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'SPAM' } });
    expect(screen.queryByLabelText('Explain your concern')).not.toBeInTheDocument();
  });
});
