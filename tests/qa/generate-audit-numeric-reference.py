"""Independent binary64/Fraction oracle for the v2 audit corrections; no JS calls.

R7 retains the existing binary64 position h=(n-1)*i/k. Interpolate the two
binary64 endpoints with its binary64 fractional part exactly, then round once
to nearest binary64, ties to even. No epsilon-based merging of thresholds.
"""
import json
import math
import pathlib
import random
import sys
from fractions import Fraction as F

out = pathlib.Path(__file__).with_name('audit-numeric-reference.json')
small = math.ulp(0.0)
datasets = [[1, 1+2**-52, 1+2**-51], [small, 2*small, 3*small, 4*small],
            [0, small, 2*small, 3*small, 5*small], [None, 0, 0, 1, 7, 7],
            [-sys.float_info.max, -1, 0, 1, sys.float_info.max]]
rng = random.Random(20261016)
for _ in range(100):
    origin = rng.choice([1.0, 1e15, 1e300, small])
    pool = [origin]
    for _ in range(7):
        pool.append(math.nextafter(pool[-1], math.inf))
    datasets.append([rng.choice(pool) for _ in range(8)])
cases = []
for values in datasets:
    ordered = sorted(v for v in values if v is not None)
    for classes in [2, 3, 5]:
        k = min(classes, len(set(ordered)))
        uppers = []
        for i in range(1, k+1):
            h = (len(ordered)-1)*i/k
            lo = math.floor(h)
            t = F(h-lo)
            upper = float(F(ordered[lo])*(1-t)+F(ordered[min(lo+1,len(ordered)-1)])*t)
            if upper not in uppers:
                uppers.append(upper)
        assignments = [None if v is None else next(i for i,u in enumerate(uppers) if v <= u) for v in values]
        cases.append(dict(values=values, classes=classes, breaks=[ordered[0]]+uppers, assignments=assignments))
rates = []
for value, denominator, scale in [(1e308,.1,.1), (1e-308,1e308,1e308),
        (-1e-308,1e308,1e308), (small,1e308,1e308), (1e308,small,small),
        (0,small,1e308), (1e308,1e308,1e308), (1e-308,1e-308,1e-308)]:
    rates.append(dict(value=value,denominator=denominator,scale=scale,
                      expected=float(F(value)/F(denominator)*F(scale))))
payload = json.dumps(dict(policy=__doc__.strip(),quantiles=cases,rates=rates),indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:
    assert out.read_text(encoding='utf8') == payload, 'Independent audit numeric fixture drift'
    print('Verified independent audit numeric references')
else:
    out.write_text(payload,encoding='utf8',newline='\n')
    print('Generated independent Fraction references before engine correction')
