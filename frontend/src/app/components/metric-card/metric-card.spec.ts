import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricCard } from './metric-card';

describe('MetricCard', () => {
  let component: MetricCard;
  let fixture: ComponentFixture<MetricCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricCard],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parameter', 'velocity');
    fixture.componentRef.setInput('unit', 'cm/s');
    fixture.componentRef.setInput('metric', { value: 185.4, unit: 'cm/s', history: [] });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
