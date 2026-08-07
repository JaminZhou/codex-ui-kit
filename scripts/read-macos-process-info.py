#!/usr/bin/env python3

import ctypes
import ctypes.util
import json
import os
import sys


CTL_KERN = 1
KERN_PROCARGS2 = 49
PROC_PIDPATHINFO_MAXSIZE = 4096


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if len(sys.argv) != 2:
    fail("usage: read-macos-process-info.py <pid>")

try:
    pid = int(sys.argv[1])
except ValueError:
    fail("pid must be an integer")

if pid <= 0:
    fail("pid must be positive")

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
mib = (ctypes.c_int * 3)(CTL_KERN, KERN_PROCARGS2, pid)
size = ctypes.c_size_t()
if libc.sysctl(mib, 3, None, ctypes.byref(size), None, 0) != 0:
    fail(os.strerror(ctypes.get_errno()))

buffer = ctypes.create_string_buffer(size.value)
if libc.sysctl(mib, 3, buffer, ctypes.byref(size), None, 0) != 0:
    fail(os.strerror(ctypes.get_errno()))

data = buffer.raw[: size.value]
if len(data) < ctypes.sizeof(ctypes.c_int):
    fail("kernel returned a truncated process argument buffer")

argc = int.from_bytes(
    data[: ctypes.sizeof(ctypes.c_int)], sys.byteorder, signed=True
)
if argc <= 0:
    fail("kernel returned an invalid process argument count")

offset = ctypes.sizeof(ctypes.c_int)
executable_end = data.find(b"\0", offset)
if executable_end < 0:
    fail("kernel process argument buffer has no executable terminator")

offset = executable_end + 1
while offset < len(data) and data[offset] == 0:
    offset += 1

argv = []
for _ in range(argc):
    argument_end = data.find(b"\0", offset)
    if argument_end < 0:
        fail("kernel process argument buffer ended before argv")
    argv.append(data[offset:argument_end].decode("utf-8", "surrogateescape"))
    offset = argument_end + 1

libproc_path = ctypes.util.find_library("proc") or "/usr/lib/libproc.dylib"
libproc = ctypes.CDLL(libproc_path, use_errno=True)
path_buffer = ctypes.create_string_buffer(PROC_PIDPATHINFO_MAXSIZE)
path_size = libproc.proc_pidpath(pid, path_buffer, len(path_buffer))
if path_size <= 0:
    fail(os.strerror(ctypes.get_errno()))

print(
    json.dumps(
        {
            "argv": argv,
            "executablePath": path_buffer.value.decode("utf-8", "surrogateescape"),
        },
        ensure_ascii=True,
        separators=(",", ":"),
    )
)
