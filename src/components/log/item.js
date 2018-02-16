// @flow
import formatDate from 'date-fns/format'
import React from 'react'

import type {LogItem} from '../../types'

const FORMAT = 'HH:mm:ss'

export default function Item (props: LogItem) {
  return (
    <div className='LogItem'>
      <small className='LogItem-createdAt'>
        {formatDate(props.createdAt, FORMAT)}
      </small>
      <span className='LogItem-text'>
        {props.text}
      </span>
    </div>
  )
}
