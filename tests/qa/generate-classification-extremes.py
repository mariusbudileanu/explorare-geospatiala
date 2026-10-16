"""Binary64 inputs; independent exact Fraction/exhaustive Jenks oracle.

This supplements, never rewrites, classification-reference.json. Expectations do
not come from the JavaScript engine or QGIS. --check verifies the tracked fixture.
"""
import itertools
import json
import math
import pathlib
import random
import sys
from fractions import Fraction as F

ROOT = pathlib.Path(__file__).resolve().parents[2]
SEED = 62448133
maximum = sys.float_info.max
smallest = math.ulp(0.0)
near = [1e308]
for _ in range(4):
    near.append(math.nextafter(near[-1], math.inf))
cases = [
    ('equal-overflow', [0.0, 5e307, 1e308]),
    ('negative-overflow', [-1e308, -5e307, 0.0]),
    ('opposite-extremes', [-1e308, 0.0, 1e308]),
    ('large-positive', [1e308, 1.2e308, 1.6e308]),
    ('large-negative', [-1.6e308, -1.2e308, -1e308]),
    ('maximum-neighbors', [math.nextafter(math.nextafter(maximum, 0), 0), math.nextafter(maximum, 0), maximum]),
    ('maximum-duplicates', [maximum, maximum, maximum]),
    ('maximum-opposite', [-maximum, 0.0, maximum]),
    ('subnormal', [0.0, smallest, 2*smallest, 3*smallest, 5*smallest]),
    ('signed-subnormal', [-4*smallest, -smallest, 0.0, smallest, 3*smallest]),
    ('tiny-normal', [0.0, 1e-300, 2e-300, 4e-300]),
    ('jenks-underflow', [0.0, 1.0, 100.0, 1e308]),
    ('jenks-multiple-small-clusters', [0.0, 1.0, 10.0, 100.0, 1e308]),
    ('jenks-negative-outlier', [-1e308, -100.0, -1.0, 0.0]),
    ('jenks-opposite-outliers', [-1e308, -1.0, 0.0, 1.0, 1e308]),
    ('near-large', near),
    ('tiny-outlier', [-1.0, 0.0, smallest, 2.0, 3.0]),
    ('duplicates', [0.0, 0.0, 1.0, 1.0, 100.0, 1e308, 1e308]),
    ('ordinary', [-100.0, 0.0, 1.0, 2.0, 9.0, 100.0]),
    ('exact-tie', [0.0, 1.0, 2.0]),
]
rng = random.Random(SEED)
for i in range(32):
    raw = [0.0]
    for _ in range(rng.randint(3, 6)):
        raw.append(math.ldexp(rng.choice([-1, 1])*rng.randint(1, 15), rng.choice([-1074, -1000, -500, -3, 0, 500, 900, 970])))
    if i % 3 == 0:
        raw[-1] = raw[1]
    cases.append(('fuzz-'+str(i), raw))

result = []
for name, raw in cases:
    ordered = sorted(raw)
    distinct = sorted(set(raw))
    costs = {}
    for a in range(len(distinct)):
        for b in range(a+1, len(distinct)+1):
            group = [F(v) for v in ordered if distinct[a] <= v <= distinct[b-1]]
            mean = sum(group)/len(group)
            costs[a, b] = sum((v-mean)**2 for v in group)
    for requested in [1, 2, 3, 4, 5, 7]:
        k = min(requested, len(distinct))
        for method in ['equal', 'quantile', 'jenks']:
            optimum = None
            if method == 'jenks':
                best = None
                for cuts in itertools.combinations(range(1, len(distinct)), k-1):
                    bounds = (0,)+cuts+(len(distinct),)
                    score = sum(costs[a, b] for a, b in zip(bounds, bounds[1:]))
                    key = (score, tuple(reversed(cuts)))
                    if best is None or key < best[0]:
                        best = (key, bounds)
                breaks = [ordered[0]]+[distinct[end-1] for end in best[1][1:]]
                optimum = {'numerator': str(best[0][0].numerator), 'denominator': str(best[0][0].denominator)}
            elif k == 1:
                breaks = [ordered[0], ordered[-1]]
            elif method == 'equal':
                upper = [float(F(ordered[0])+(F(ordered[-1])-F(ordered[0]))*F(i, k)) for i in range(1, k)]+[ordered[-1]]
                breaks = [ordered[0]]+list(dict.fromkeys(upper))
            else:
                upper = []
                for i in range(1, k):
                    position = (len(ordered)-1)*i/k
                    lower = math.floor(position)
                    t = position-lower
                    # Audit correction: round exact binary64 endpoint interpolation
                    # once, rather than round the two products before their sum.
                    upper.append(float(F(ordered[lower])*(1-F(t))+F(ordered[lower+1])*F(t)))
                breaks = [ordered[0]]+list(dict.fromkeys(upper+[ordered[-1]]))
            assignments = [next(i for i, upper in enumerate(breaks[1:]) if v <= upper) for v in raw]
            result.append({'name': name, 'values': raw, 'method': method, 'classes': requested,
                           'breaks': breaks, 'assignments': assignments, 'objective': optimum})

payload = json.dumps({'oracle': 'Python Fraction; exhaustive contiguous Jenks optimum on exact binary64 inputs',
                      'seed': SEED, 'fuzzDatasets': 32, 'cases': result}, indent=2, allow_nan=False)+'\n'
target = ROOT/'tests/qa/classification-extreme-reference.json'
if '--check' in sys.argv:
    if target.read_text(encoding='utf8') != payload:
        raise SystemExit('Extreme numeric fixture drift')
else:
    target.write_text(payload, encoding='utf8')
print('Extreme reference:', len(result), 'cases; seed', SEED)
