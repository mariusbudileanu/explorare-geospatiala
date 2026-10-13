"""Independent Fraction oracle and IEEE-754 rounding envelopes; never calls JS.

The R7 position is also recorded as the binary64 position used by the existing
runtime. Bounds account for rounding of the complement, products, difference
and final sum, rather than assuming every linear interpolation is correctly
rounded in one operation. Equal endpoints and t=0/1 have exact bounds.
"""
import json
import math
import pathlib
import random
import sys
from fractions import Fraction as F

ROOT = pathlib.Path(__file__).resolve().parents[2]
M = sys.float_info.max
SMALL = math.ulp(0.0)
SEEDS = [62448133, 62448134, 97442357]


def half_ulp(value):
    return F(math.ulp(float(value))) / 2


def directed(value, upwards):
    rounded = float(value)
    if upwards and F(rounded) < value:
        rounded = math.nextafter(rounded, math.inf)
    if not upwards and F(rounded) > value:
        rounded = math.nextafter(rounded, -math.inf)
    return rounded


def oracle(a, b, t):
    fa, fb, ft = F(a), F(b), F(t)
    exact = fa + (fb-fa)*ft
    nearest = float(exact)
    if a == b or t in (0.0, 1.0):
        return {'nearest': nearest, 'lower': nearest, 'upper': nearest}
    complement = F(float(1-ft))
    error = abs(fa)*abs(complement-(1-ft))
    error += half_ulp(fa*complement) + half_ulp(fb*ft) + half_ulp(exact)
    span = fb-fa
    try:
        rounded_span = F(float(span))
        left = abs(ft)*abs(rounded_span-span) + half_ulp(rounded_span*ft) + half_ulp(exact)
        right = abs(1-ft)*abs(rounded_span-span) + abs(rounded_span)*abs(complement-(1-ft))
        right += half_ulp(rounded_span*complement) + half_ulp(exact)
        error = max(error, left, right)
    except OverflowError:
        pass  # Opposite-sign difference is not a usable binary64 intermediate.
    lower = max(min(fa, fb), exact-error)
    upper = min(max(fa, fb), exact+error)
    return {'nearest': nearest, 'lower': directed(lower, False), 'upper': directed(upper, True)}


def quantile_case(name, values, classes, seed=None):
    ordered = sorted(values)
    k = min(classes, len(set(ordered)))
    thresholds = []
    for i in range(1, k+1):
        exact_position = F((len(ordered)-1)*i, k)
        position = float(exact_position)
        index = math.floor(position)
        t = position-index
        a, b = ordered[index], ordered[min(index+1, len(ordered)-1)]
        thresholds.append({'index': index, 't': t, **oracle(a, b, t)})
    return {'name': name, 'seed': seed, 'values': values, 'classes': classes, 'thresholds': thresholds}


near = [M]
for _ in range(4):
    near.insert(0, math.nextafter(near[0], 0.0))
cases = []
# Exact audit family: five consecutive finite maxima, 0..19 extra maxima,
# both signs, and the five original requested class counts: 200 cases.
for sign in [1, -1]:
    for duplicates in range(20):
        for classes in [2, 3, 4, 5, 7]:
            cases.append(quantile_case('audit-max-'+str(sign)+'-'+str(duplicates),
                                       [sign*v for v in near+[M]*duplicates], classes))

targets = [
    ('exact-reproduction', near+[M]*3),
    ('max-duplicates', [M]*8),
    ('max-neighbors', near),
    ('large-positive', [1e308, 1.2e308, 1.6e308]),
    ('large-negative', [-1.6e308, -1.2e308, -1e308]),
    ('crossing-zero', [-M, -1.0, 0.0, 1.0, M]),
    ('positive-subnormals', [SMALL, 2*SMALL, 3*SMALL, 7*SMALL]),
    ('zero-subnormals', [0.0, SMALL, 2*SMALL, 5*SMALL]),
    ('duplicate-heavy', [0.0]*7+[1.0]*3+[7.0]*6+[M]*4),
    ('all-equal', [-7.0]*8),
    ('small-n', [SMALL, M]),
    ('signed-zero', [-0.0, 0.0, -0.0, 0.0]),
]
for name, values in targets:
    for classes in [1, 2, 3, 4, 5, 7, 100]:
        cases.append(quantile_case(name, values, classes))

fuzz_count = 0
for seed in SEEDS:
    rng = random.Random(seed)
    for family in range(8):
        for repeat in range(8):
            count = rng.randint(3, 12)
            if family == 0:
                values = [float(rng.randint(-100, 100))/7 for _ in range(count)]
            elif family == 1:
                values = [math.ldexp(rng.choice([-1, 1])*rng.randint(1, 7), rng.choice([-1074, -1000, -500, -10, 0, 500, 900, 1020])) for _ in range(count)]
            elif family in [2, 3]:
                sign = 1 if family == 2 else -1
                pool = [M]
                for _ in range(32):
                    pool.append(math.nextafter(pool[-1], 0.0))
                values = [sign*rng.choice(pool) for _ in range(count)]
            elif family == 4:
                pool = [rng.choice([1.0, 1e15, 1e300, 1e308])]
                for _ in range(12):
                    pool.append(math.nextafter(pool[-1], math.inf))
                values = [rng.choice(pool) for _ in range(count)]
            elif family == 5:
                values = [rng.randint(-32, 32)*SMALL for _ in range(count)]
            elif family == 6:
                pool = [rng.choice([-M, -7.0, -SMALL]), 0.0, rng.choice([SMALL, 7.0, M])]
                values = [rng.choice(pool) for _ in range(count)]
            else:
                values = [0.0]*(count-2)+[rng.choice([-M, -1.0, -SMALL]), rng.choice([SMALL, 1.0, M])]
            for classes in [1, 2, 3, 4, 5, 7]:
                cases.append(quantile_case('fuzz-'+str(seed)+'-'+str(family)+'-'+str(repeat), values, classes, seed))
                fuzz_count += 1

pairs = [(M, M), (-M, -M), (0.0, 0.0), (-0.0, 0.0), (SMALL, SMALL), (7.0, 7.0),
         (M, -M), (-M, M), (near[0], M), (M, near[0]), (-M, -near[0]),
         (SMALL, 2*SMALL), (0.0, SMALL), (-SMALL, SMALL), (-1.0, 1.0),
         (5.0, 7.0), (7.0, 5.0), (1e300, math.nextafter(1e300, math.inf))]
interpolation = []
for a, b in pairs:
    for t in [0.0, SMALL, 0.1, 0.4, 0.5, 0.6, 0.9, math.nextafter(1.0, 0.0), 1.0]:
        interpolation.append({'a': a, 'b': b, 't': t, **oracle(a, b, t)})
for seed in SEEDS:
    rng = random.Random(seed)
    for _ in range(100):
        a, b = rng.choice(pairs)
        t = rng.random()
        interpolation.append({'a': a, 'b': b, 't': t, **oracle(a, b, t)})

payload = json.dumps({'oracle': 'Python Fraction with explicit binary64 rounding envelopes',
                      'seeds': SEEDS, 'auditCases': 200, 'targetCases': len(targets)*7,
                      'fuzzCases': fuzz_count, 'interpolation': interpolation, 'cases': cases},
                     indent=2, allow_nan=False)+'\n'
target = ROOT/'tests/qa/quantile-reference.json'
if '--check' in sys.argv:
    if target.read_text(encoding='utf8') != payload:
        raise SystemExit('Quantile reference drift')
else:
    target.write_text(payload, encoding='utf8')
print('Quantile reference:', len(cases), 'cases;', len(interpolation), 'interpolation checks;', 'seeds', SEEDS)
