import React, { Component } from 'react';

export default function({ token }) {
  const { id, confirmed, confirmations, error } = token;
  return (
    <div>
      <h3>{ id.toString() }</h3>
      <div>Confirmations: {confirmations}</div>
      <div>Confirmed: {confirmed ? "Yes" : "No"}</div>
      <div>Error: {error}</div>
    </div>
  );
}