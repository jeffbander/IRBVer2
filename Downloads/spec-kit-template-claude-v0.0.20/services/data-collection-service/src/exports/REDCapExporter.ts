import { Pool } from 'pg';
import {
  ExportParameters,
  FormResponse,
  Form,
  Visit,
  Participant
} from '@research-study/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

interface REDCapInstrument {
  instrument_name: string;
  instrument_label: string;
  fields: REDCapField[];
}

interface REDCapField {
  field_name: string;
  form_name: string;
  section_header?: string;
  field_type: string;
  field_label: string;
  select_choices_or_calculations?: string;
  field_note?: string;
  text_validation_type_or_show_slider_number?: string;
  text_validation_min?: string;
  text_validation_max?: string;
  identifier?: string;
  branching_logic?: string;
  required_field?: string;
  custom_alignment?: string;
  question_number?: string;
  matrix_group_name?: string;
  matrix_ranking?: string;
  field_annotation?: string;
}

export class REDCapExporter {
  constructor(private db: Pool) {}

  async exportToREDCap(
    studyId: string,
    parameters: ExportParameters,
    outputPath: string
  ): Promise<string> {
    try {
      // Get study information
      const study = await this.getStudyInfo(studyId);

      // Create output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(outputPath, `REDCap_${study.protocolNumber}_${timestamp}`);
      await fs.mkdir(exportDir, { recursive: true });

      // Generate REDCap data dictionary
      const dataDictionary = await this.generateDataDictionary(studyId, parameters);
      await this.writeDataDictionary(dataDictionary, path.join(exportDir, 'data_dictionary.csv'));

      // Export data
      const data = await this.exportData(studyId, parameters);
      await this.writeDataFile(data, path.join(exportDir, 'data.csv'));

      // Export project XML
      const projectXML = await this.generateProjectXML(study, dataDictionary, data);
      await fs.writeFile(path.join(exportDir, 'project.xml'), projectXML, 'utf8');

      // Create README
      await this.createREDCapReadme(study, path.join(exportDir, 'README.md'));

      return exportDir;
    } catch (error) {
      console.error('Error exporting to REDCap:', error);
      throw error;
    }
  }

  private async generateDataDictionary(
    studyId: string,
    parameters: ExportParameters
  ): Promise<REDCapField[]> {
    const fields: REDCapField[] = [];

    // Add standard participant identifier fields
    fields.push({
      field_name: 'record_id',
      form_name: 'demographics',
      field_type: 'text',
      field_label: 'Record ID',
      identifier: 'y',
      required_field: 'y',
      field_annotation: ''
    });

    fields.push({
      field_name: 'redcap_event_name',
      form_name: 'demographics',
      field_type: 'text',
      field_label: 'Event Name',
      field_annotation: ''
    });

    // Add demographics fields
    const demoFields = await this.generateDemographicsFields();
    fields.push(...demoFields);

    // Add form fields
    const formFields = await this.generateFormFields(studyId, parameters);
    fields.push(...formFields);

    return fields;
  }

  private async generateDemographicsFields(): Promise<REDCapField[]> {
    return [
      {
        field_name: 'demographics_complete',
        form_name: 'demographics',
        section_header: 'Form Status',
        field_type: 'dropdown',
        field_label: 'Complete?',
        select_choices_or_calculations: '0, Incomplete | 1, Unverified | 2, Complete',
        field_annotation: ''
      },
      {
        field_name: 'age',
        form_name: 'demographics',
        section_header: 'Demographics',
        field_type: 'text',
        field_label: 'Age',
        text_validation_type_or_show_slider_number: 'integer',
        text_validation_min: '18',
        text_validation_max: '120',
        field_annotation: ''
      },
      {
        field_name: 'sex',
        form_name: 'demographics',
        field_type: 'radio',
        field_label: 'Sex',
        select_choices_or_calculations: '1, Male | 2, Female | 3, Other',
        field_annotation: ''
      },
      {
        field_name: 'race',
        form_name: 'demographics',
        field_type: 'dropdown',
        field_label: 'Race',
        select_choices_or_calculations: '1, White | 2, Black or African American | 3, Asian | 4, American Indian or Alaska Native | 5, Native Hawaiian or Other Pacific Islander | 6, Other',
        field_annotation: ''
      },
      {
        field_name: 'ethnicity',
        form_name: 'demographics',
        field_type: 'radio',
        field_label: 'Ethnicity',
        select_choices_or_calculations: '1, Hispanic or Latino | 2, Not Hispanic or Latino | 3, Unknown',
        field_annotation: ''
      },
      {
        field_name: 'enrollment_date',
        form_name: 'demographics',
        field_type: 'text',
        field_label: 'Enrollment Date',
        text_validation_type_or_show_slider_number: 'date_ymd',
        field_annotation: ''
      }
    ];
  }

  private async generateFormFields(
    studyId: string,
    parameters: ExportParameters
  ): Promise<REDCapField[]> {
    const fields: REDCapField[] = [];

    // Get all forms for the study
    const formsQuery = `
      SELECT DISTINCT f.id, f.name, f.title, f.schema
      FROM forms f
      JOIN form_responses fr ON f.id = fr.form_id
      JOIN participants p ON fr.participant_id = p.id
      WHERE p.study_id = $1
      ${this.buildFormFilter(parameters.forms, 'f')}
      ORDER BY f.name
    `;

    const formsResult = await this.db.query(formsQuery, [studyId]);

    for (const form of formsResult.rows) {
      const formFields = this.convertFormToREDCapFields(form);
      fields.push(...formFields);
    }

    return fields;
  }

  private convertFormToREDCapFields(form: any): REDCapField[] {
    const fields: REDCapField[] = [];
    const formName = this.sanitizeFormName(form.name);
    const schema = form.schema;

    // Add section headers if layout has sections
    if (schema.layout && schema.layout.sections) {
      for (const section of schema.layout.sections) {
        // Add section header field
        const sectionFields = section.fieldIds.map((fieldId: string) =>
          schema.fields.find((f: any) => f.id === fieldId)
        ).filter(Boolean);

        if (sectionFields.length > 0) {
          sectionFields.forEach((field: any, index: number) => {
            const redcapField = this.convertFieldToREDCap(field, formName);
            if (index === 0) {
              redcapField.section_header = section.title;
            }
            fields.push(redcapField);
          });
        }
      }
    } else {
      // Add all fields in order
      schema.fields.forEach((field: any) => {
        const redcapField = this.convertFieldToREDCap(field, formName);
        fields.push(redcapField);
      });
    }

    // Add form completion status field
    fields.push({
      field_name: `${formName}_complete`,
      form_name: formName,
      section_header: 'Form Status',
      field_type: 'dropdown',
      field_label: 'Complete?',
      select_choices_or_calculations: '0, Incomplete | 1, Unverified | 2, Complete',
      field_annotation: ''
    });

    return fields;
  }

  private convertFieldToREDCap(field: any, formName: string): REDCapField {
    const fieldName = this.sanitizeFieldName(field.name);

    const redcapField: REDCapField = {
      field_name: fieldName,
      form_name: formName,
      field_type: this.mapFieldType(field.type),
      field_label: field.label,
      field_note: field.description,
      required_field: field.required ? 'y' : '',
      field_annotation: ''
    };

    // Handle field-specific properties
    switch (field.type) {
      case 'SELECT':
      case 'RADIO':
        redcapField.select_choices_or_calculations = this.convertOptionsToREDCap(field.options);
        break;
      case 'CHECKBOX':
      case 'MULTISELECT':
        redcapField.field_type = 'checkbox';
        redcapField.select_choices_or_calculations = this.convertOptionsToREDCap(field.options);
        break;
      case 'NUMBER':
        redcapField.text_validation_type_or_show_slider_number = 'number';
        if (field.validation) {
          redcapField.text_validation_min = field.validation.min?.toString();
          redcapField.text_validation_max = field.validation.max?.toString();
        }
        break;
      case 'EMAIL':
        redcapField.text_validation_type_or_show_slider_number = 'email';
        break;
      case 'DATE':
        redcapField.text_validation_type_or_show_slider_number = 'date_ymd';
        break;
      case 'DATETIME':
        redcapField.text_validation_type_or_show_slider_number = 'datetime_ymd';
        break;
      case 'TIME':
        redcapField.text_validation_type_or_show_slider_number = 'time';
        break;
      case 'RANGE':
        redcapField.field_type = 'slider';
        if (field.validation) {
          redcapField.text_validation_min = field.validation.min?.toString();
          redcapField.text_validation_max = field.validation.max?.toString();
        }
        break;
    }

    // Handle conditional logic
    if (field.conditionalLogic) {
      redcapField.branching_logic = this.convertConditionalLogic(field.conditionalLogic);
    }

    // Handle validation
    if (field.validation) {
      if (field.validation.pattern) {
        // Convert regex pattern to REDCap validation if possible
        redcapField.field_annotation += `Pattern: ${field.validation.pattern}`;
      }
    }

    return redcapField;
  }

  private mapFieldType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'TEXT': 'text',
      'TEXTAREA': 'notes',
      'NUMBER': 'text',
      'EMAIL': 'text',
      'PASSWORD': 'text',
      'DATE': 'text',
      'DATETIME': 'text',
      'TIME': 'text',
      'SELECT': 'dropdown',
      'MULTISELECT': 'checkbox',
      'RADIO': 'radio',
      'CHECKBOX': 'checkbox',
      'BOOLEAN': 'yesno',
      'FILE': 'file',
      'SIGNATURE': 'file',
      'RANGE': 'slider',
      'RATING': 'radio',
      'CALCULATED': 'calc'
    };
    return typeMap[fieldType] || 'text';
  }

  private convertOptionsToREDCap(options: any[]): string {
    if (!options || options.length === 0) return '';

    return options.map((option, index) => {
      const value = option.value || (index + 1).toString();
      const label = option.label || option.value;
      return `${value}, ${label}`;
    }).join(' | ');
  }

  private convertConditionalLogic(logic: any): string {
    // Convert form conditional logic to REDCap branching logic
    // This is a simplified conversion - full implementation would need more complex parsing
    if (!logic || !logic.rules) return '';

    const conditions = logic.rules.map((rule: any) => {
      const operator = this.mapConditionalOperator(rule.operator);
      return `[${rule.fieldId}] ${operator} "${rule.value}"`;
    });

    return conditions.join(` ${logic.condition.toLowerCase()} `);
  }

  private mapConditionalOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'EQUALS': '=',
      'NOT_EQUALS': '<>',
      'GREATER_THAN': '>',
      'LESS_THAN': '<',
      'GREATER_THAN_OR_EQUAL': '>=',
      'LESS_THAN_OR_EQUAL': '<=',
      'CONTAINS': 'contains',
      'IS_EMPTY': '= ""',
      'IS_NOT_EMPTY': '<> ""'
    };
    return operatorMap[operator] || '=';
  }

  private async exportData(
    studyId: string,
    parameters: ExportParameters
  ): Promise<Record<string, any>[]> {
    const data: Record<string, any>[] = [];

    // Get participants
    const participantsQuery = `
      SELECT
        p.external_id as record_id,
        p.age,
        p.gender as sex,
        p.race,
        p.ethnicity,
        p.enrollment_date,
        s.protocol_number as studyid
      FROM participants p
      JOIN studies s ON p.study_id = s.id
      WHERE p.study_id = $1
      ${this.buildDateFilter('p.enrollment_date', parameters.dateRange)}
      ${this.buildParticipantFilter(parameters.participants)}
      ORDER BY p.external_id
    `;

    const participantsResult = await this.db.query(participantsQuery, [studyId]);

    for (const participant of participantsResult.rows) {
      // Get visits for this participant
      const visitsQuery = `
        SELECT
          v.id,
          vd.name as visit_name,
          vd.visit_number,
          v.actual_date
        FROM visits v
        JOIN visit_definitions vd ON v.visit_definition_id = vd.id
        WHERE v.participant_id = (
          SELECT id FROM participants WHERE external_id = $1 AND study_id = $2
        )
        ORDER BY vd.visit_number
      `;

      const visitsResult = await this.db.query(visitsQuery, [participant.record_id, studyId]);

      for (const visit of visitsResult.rows) {
        const record: Record<string, any> = {
          record_id: participant.record_id,
          redcap_event_name: this.sanitizeEventName(visit.visit_name),
          // Demographics
          age: participant.age,
          sex: this.mapSexToREDCap(participant.sex),
          race: this.mapRaceToREDCap(participant.race),
          ethnicity: this.mapEthnicityToREDCap(participant.ethnicity),
          enrollment_date: this.formatDateForREDCap(participant.enrollment_date),
          demographics_complete: '2' // Complete
        };

        // Get form responses for this visit
        const responsesQuery = `
          SELECT
            f.name as form_name,
            f.schema,
            fr.data,
            fr.status
          FROM form_responses fr
          JOIN forms f ON fr.form_id = f.id
          WHERE fr.participant_id = (
            SELECT id FROM participants WHERE external_id = $1 AND study_id = $2
          )
          AND fr.visit_id = $3
          ${this.buildFormFilter(parameters.forms, 'f')}
        `;

        const responsesResult = await this.db.query(responsesQuery, [
          participant.record_id,
          studyId,
          visit.id
        ]);

        // Add form data to record
        for (const response of responsesResult.rows) {
          const formName = this.sanitizeFormName(response.form_name);
          const formData = response.data || {};

          // Map form fields to REDCap format
          const schema = response.schema;
          for (const field of schema.fields) {
            const fieldName = this.sanitizeFieldName(field.name);
            const value = formData[field.id];

            if (value !== undefined && value !== null) {
              record[fieldName] = this.formatValueForREDCap(field, value);
            }
          }

          // Add form completion status
          record[`${formName}_complete`] = this.mapStatusToREDCap(response.status);
        }

        data.push(record);
      }
    }

    return data;
  }

  private async writeDataDictionary(
    fields: REDCapField[],
    filePath: string
  ): Promise<void> {
    const headers = [
      'Variable / Field Name',
      'Form Name',
      'Section Header',
      'Field Type',
      'Field Label',
      'Choices, Calculations, OR Slider Labels',
      'Field Note',
      'Text Validation Type OR Show Slider Number',
      'Text Validation Min',
      'Text Validation Max',
      'Identifier?',
      'Branching Logic (Show field only if...)',
      'Required Field?',
      'Custom Alignment',
      'Question Number (surveys only)',
      'Matrix Group Name',
      'Matrix Ranking?',
      'Field Annotation'
    ];

    const csvContent = [
      headers.join(','),
      ...fields.map(field => [
        this.escapeCsvValue(field.field_name),
        this.escapeCsvValue(field.form_name),
        this.escapeCsvValue(field.section_header || ''),
        this.escapeCsvValue(field.field_type),
        this.escapeCsvValue(field.field_label),
        this.escapeCsvValue(field.select_choices_or_calculations || ''),
        this.escapeCsvValue(field.field_note || ''),
        this.escapeCsvValue(field.text_validation_type_or_show_slider_number || ''),
        this.escapeCsvValue(field.text_validation_min || ''),
        this.escapeCsvValue(field.text_validation_max || ''),
        this.escapeCsvValue(field.identifier || ''),
        this.escapeCsvValue(field.branching_logic || ''),
        this.escapeCsvValue(field.required_field || ''),
        this.escapeCsvValue(field.custom_alignment || ''),
        this.escapeCsvValue(field.question_number || ''),
        this.escapeCsvValue(field.matrix_group_name || ''),
        this.escapeCsvValue(field.matrix_ranking || ''),
        this.escapeCsvValue(field.field_annotation || '')
      ].join(','))
    ].join('\n');

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  private async writeDataFile(
    data: Record<string, any>[],
    filePath: string
  ): Promise<void> {
    if (data.length === 0) {
      await fs.writeFile(filePath, '', 'utf8');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(record =>
        headers.map(header => this.escapeCsvValue(record[header] || '')).join(',')
      )
    ].join('\n');

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  private async generateProjectXML(
    study: any,
    fields: REDCapField[],
    data: Record<string, any>[]
  ): Promise<string> {
    // Generate REDCap project XML for import
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project>
  <ProjectSettings>
    <project_title>${study.title}</project_title>
    <purpose>0</purpose>
    <purpose_other></purpose_other>
    <project_notes>${study.description}</project_notes>
    <custom_record_label></custom_record_label>
    <secondary_unique_field></secondary_unique_field>
    <is_longitudinal>1</is_longitudinal>
    <surveys_enabled>0</surveys_enabled>
    <scheduling_enabled>1</scheduling_enabled>
    <record_autonumbering_enabled>0</record_autonumbering_enabled>
    <randomization_enabled>0</randomization_enabled>
    <ddp_enabled>0</ddp_enabled>
    <project_language>English</project_language>
    <project_encoding>UTF-8</project_encoding>
  </ProjectSettings>

  <MetaData>
    ${fields.map(field => this.generateFieldXML(field)).join('\n')}
  </MetaData>

  <Arms>
    <Arm>
      <arm_num>1</arm_num>
      <name>Arm 1</name>
    </Arm>
  </Arms>

  <Events>
    ${this.generateEventsXML(data)}
  </Events>
</Project>`;

    return xml;
  }

  private generateFieldXML(field: REDCapField): string {
    return `    <Field>
      <field_name>${field.field_name}</field_name>
      <form_name>${field.form_name}</form_name>
      <field_type>${field.field_type}</field_type>
      <field_label>${this.escapeXml(field.field_label)}</field_label>
      <select_choices_or_calculations>${this.escapeXml(field.select_choices_or_calculations || '')}</select_choices_or_calculations>
      <field_note>${this.escapeXml(field.field_note || '')}</field_note>
      <text_validation_type_or_show_slider_number>${field.text_validation_type_or_show_slider_number || ''}</text_validation_type_or_show_slider_number>
      <text_validation_min>${field.text_validation_min || ''}</text_validation_min>
      <text_validation_max>${field.text_validation_max || ''}</text_validation_max>
      <identifier>${field.identifier || ''}</identifier>
      <branching_logic>${this.escapeXml(field.branching_logic || '')}</branching_logic>
      <required_field>${field.required_field || ''}</required_field>
    </Field>`;
  }

  private generateEventsXML(data: Record<string, any>[]): string {
    const events = [...new Set(data.map(record => record.redcap_event_name))];

    return events.map((event, index) => `    <Event>
      <event_id>${index + 1}</event_id>
      <arm_num>1</arm_num>
      <day_offset>0</day_offset>
      <offset_min>0</offset_min>
      <offset_max>0</offset_max>
      <unique_event_name>${event}</unique_event_name>
      <custom_event_label>${event}</custom_event_label>
    </Event>`).join('\n');
  }

  private async createREDCapReadme(study: any, filePath: string): Promise<void> {
    const readme = `# REDCap Export: ${study.title}

## Overview
This export contains data from the Research Study Management System formatted for import into REDCap.

## Files Included
- \`data_dictionary.csv\`: REDCap data dictionary defining all fields
- \`data.csv\`: Study data in REDCap format
- \`project.xml\`: Complete REDCap project XML for import
- \`README.md\`: This file

## Import Instructions
1. Create a new project in REDCap
2. Import the project XML file to set up the complete project structure
3. Or manually import the data dictionary CSV and then the data CSV

## Data Format
- Data is formatted as a longitudinal project with events corresponding to study visits
- Each participant appears once per visit/event
- Form completion status is tracked with \`_complete\` fields

## Notes
- Exported on: ${new Date().toISOString()}
- Study Protocol: ${study.protocolNumber}
- Total Participants: Varies by export parameters

For questions about this export, contact the study team.
`;

    await fs.writeFile(filePath, readme, 'utf8');
  }

  // Helper methods
  private async getStudyInfo(studyId: string): Promise<any> {
    const query = 'SELECT * FROM studies WHERE id = $1';
    const result = await this.db.query(query, [studyId]);
    return result.rows[0];
  }

  private buildDateFilter(dateColumn: string, dateRange?: any): string {
    if (!dateRange) return '';

    let filter = '';
    if (dateRange.start) {
      filter += ` AND ${dateColumn} >= '${dateRange.start.toISOString()}'`;
    }
    if (dateRange.end) {
      filter += ` AND ${dateColumn} <= '${dateRange.end.toISOString()}'`;
    }
    return filter;
  }

  private buildParticipantFilter(participants?: string[]): string {
    if (!participants || participants.length === 0) return '';

    const placeholders = participants.map((_, index) => `$${index + 2}`).join(',');
    return ` AND p.external_id IN (${placeholders})`;
  }

  private buildFormFilter(forms?: string[], alias = ''): string {
    if (!forms || forms.length === 0) return '';

    const prefix = alias ? `${alias}.` : '';
    const placeholders = forms.map((_, index) => `$${index + 4}`).join(',');
    return ` AND ${prefix}id IN (${placeholders})`;
  }

  private sanitizeFormName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private sanitizeFieldName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private sanitizeEventName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private mapSexToREDCap(sex: string): string {
    if (!sex) return '';
    const normalized = sex.toLowerCase();
    if (normalized.includes('m')) return '1';
    if (normalized.includes('f')) return '2';
    return '3';
  }

  private mapRaceToREDCap(race: string): string {
    if (!race) return '';
    const raceMap: Record<string, string> = {
      'WHITE': '1',
      'BLACK': '2',
      'ASIAN': '3',
      'AMERICAN INDIAN': '4',
      'PACIFIC ISLANDER': '5',
      'OTHER': '6'
    };
    return raceMap[race.toUpperCase()] || '6';
  }

  private mapEthnicityToREDCap(ethnicity: string): string {
    if (!ethnicity) return '';
    const ethnicityMap: Record<string, string> = {
      'HISPANIC': '1',
      'NOT HISPANIC': '2',
      'UNKNOWN': '3'
    };
    return ethnicityMap[ethnicity.toUpperCase()] || '3';
  }

  private mapStatusToREDCap(status: string): string {
    const statusMap: Record<string, string> = {
      'DRAFT': '0',
      'PARTIAL': '1',
      'SUBMITTED': '2',
      'APPROVED': '2',
      'LOCKED': '2'
    };
    return statusMap[status] || '0';
  }

  private formatDateForREDCap(date: any): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  private formatValueForREDCap(field: any, value: any): string {
    if (value === null || value === undefined) return '';

    switch (field.type) {
      case 'DATE':
        return this.formatDateForREDCap(value);
      case 'BOOLEAN':
        return value ? '1' : '0';
      case 'CHECKBOX':
      case 'MULTISELECT':
        if (Array.isArray(value)) {
          return value.join(',');
        }
        return value.toString();
      default:
        return value.toString();
    }
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXml(value: string): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}