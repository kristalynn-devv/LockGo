import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto';

const valid = {
  station_id: '694d43a2-02c0-4644-a701-c6bd6d3ac3e3',
  size: 'Medium',
  start_time: '2026-08-23T10:00:00.000Z',
  duration_hours: 4,
};

async function issues(body: Record<string, unknown>) {
  return validate(plainToInstance(CreateReservationDto, body));
}

function properties(errors: ValidationError[]) {
  return errors.map((error) => error.property);
}

describe('CreateReservationDto', () => {
  it('AC-22 accepts a complete reservation body', async () => {
    expect(await issues(valid)).toEqual([]);
  });

  it('AC-22 rejects a body without station_id', async () => {
    const { station_id: _stationId, ...body } = valid;
    expect(properties(await issues(body))).toContain('station_id');
  });

  it('AC-22 rejects a size outside Small, Medium, or Large', async () => {
    expect(properties(await issues({ ...valid, size: 'XL' }))).toContain('size');
  });

  it('AC-12 rejects a duration of 0 hours', async () => {
    expect(properties(await issues({ ...valid, duration_hours: 0 }))).toContain(
      'duration_hours',
    );
  });

  it('AC-12 rejects a duration of 25 hours', async () => {
    expect(properties(await issues({ ...valid, duration_hours: 25 }))).toContain(
      'duration_hours',
    );
  });
});
