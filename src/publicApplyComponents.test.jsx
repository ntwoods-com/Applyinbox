import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  JobDetailsModal,
  ResumePreviewCard,
  ScreeningQuestionsSection,
} from './publicApplyComponents.jsx';

describe('public apply components', () => {
  it('renders job details and Apply Now triggers the selection callback', () => {
    const onApplyNow = vi.fn();
    render(
      <JobDetailsModal
        job={{
          label: 'Operations Executive',
          openingCount: 2,
          jobDescription: 'Coordinate field operations and reporting.',
          skills: 'Excel, communication',
          screeningQuestions: [{ id: 'notice_period', question: 'Notice period?' }],
        }}
        onClose={vi.fn()}
        onApplyNow={onApplyNow}
      />
    );

    expect(screen.getByText('Role summary')).toBeTruthy();
    expect(screen.getByText('Notice period?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    expect(onApplyNow).toHaveBeenCalledTimes(1);
  });

  it('renders PDF preview when a local preview URL is available', () => {
    render(
      <ResumePreviewCard
        file={new File(['pdf'], 'resume.pdf', { type: 'application/pdf' })}
        fileSizeText="1.0 KB"
        pdfPreviewUrl="blob:resume-preview"
        onChangeFile={vi.fn()}
      />
    );

    expect(screen.getByTitle('Resume preview')).toBeTruthy();
  });

  it('shows DOCX metadata card without inline preview', () => {
    render(
      <ResumePreviewCard
        file={
          new File(['docx'], 'resume.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })
        }
        fileSizeText="1.0 KB"
        pdfPreviewUrl=""
        onChangeFile={vi.fn()}
      />
    );

    expect(screen.queryByTitle('Resume preview')).toBeNull();
    expect(screen.getByText(/Preview is available only for PDF files/i)).toBeTruthy();
  });

  it('renders screening questions and forwards answer changes', () => {
    const onAnswerChange = vi.fn();
    render(
      <ScreeningQuestionsSection
        questions={[
          {
            id: 'weekend_shift',
            question: 'Can you work weekend shifts?',
            type: 'radio',
            required: true,
            options: ['Yes', 'No'],
          },
        ]}
        answers={{}}
        errors={{}}
        onAnswerChange={onAnswerChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Yes'));
    expect(onAnswerChange).toHaveBeenCalledWith('weekend_shift', 'Yes');
  });
});
