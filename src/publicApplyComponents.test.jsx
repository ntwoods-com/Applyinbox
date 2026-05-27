import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { ScreeningQuestionsSection } from './publicApplyComponents.jsx';
import { JobDetailsModal } from './JobDetailsModal.jsx';
import { ResumePreviewCard } from './ResumePreviewCard.jsx';

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
    fireEvent.click(screen.getByRole('button', { name: /Apply now/i }));
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

  it('renders admin-authored yes_no questions as a Yes/No radio group', () => {
    const onAnswerChange = vi.fn();
    render(
      <ScreeningQuestionsSection
        questions={[
          {
            id: 'ready_to_join',
            question: 'Can you join in 15 days?',
            type: 'yes_no',
            required: true,
          },
        ]}
        answers={{}}
        errors={{}}
        onAnswerChange={onAnswerChange}
      />
    );

    fireEvent.click(screen.getByLabelText('No'));
    expect(onAnswerChange).toHaveBeenCalledWith('ready_to_join', 'No');
  });

  it('renders admin-authored dropdown questions with backend-provided options', () => {
    const onAnswerChange = vi.fn();
    render(
      <ScreeningQuestionsSection
        questions={[
          {
            id: 'notice_period',
            question: 'Notice period?',
            type: 'dropdown',
            options: ['Immediate', '15 days', '30 days'],
          },
        ]}
        answers={{}}
        errors={{}}
        onAnswerChange={onAnswerChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Notice period?'), {
      target: { value: '15 days' },
    });
    expect(onAnswerChange).toHaveBeenCalledWith('notice_period', '15 days');
  });
});
