import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Authorized } from './authorized';

describe('Authorized', () => {
  let component: Authorized;
  let fixture: ComponentFixture<Authorized>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Authorized],
    }).compileComponents();

    fixture = TestBed.createComponent(Authorized);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
